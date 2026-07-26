import { Component, OnInit, signal, inject, ElementRef, viewChild, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './chatbot.html',
  styleUrl: './chatbot.css'
})
export class Chatbot implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  
  // Element reference for auto-scroll
  private messageBody = viewChild<ElementRef>('messageBody');

  isOpen = signal(false);
  isSoundEnabled = signal(true);
  speakingMsgIndex = signal<number | null>(null);
  session = '';
  userInput = '';
  isTyping = signal(false);

  messages = signal<Array<{ text: string, sender: 'devotee' | 'bajrangi', time: Date }>>([]);

  quickPrompts = [
    { text: 'Aarti Timings 🌅', query: 'timings' },
    { text: 'How to Donate 🪙', query: 'donate' },
    { text: 'Book a Pooja 🪔', query: 'book pooja' },
    { text: 'Hanuman Shloka 🚩', query: 'shloka' }
  ];

  ngOnInit() {
    // Generate session ID
    this.session = 'SESS-' + Math.random().toString(36).substring(2, 11).toUpperCase();
    
    // Add default initial greeting from Bajrangi
    this.messages.set([
      {
        text: 'Jai Shri Ram! 🙏 I am Bajrangi, the temple\'s AI assistant. How may I serve your spiritual journey today?',
        sender: 'bajrangi',
        time: new Date()
      }
    ]);
  }

  ngOnDestroy() {
    this.stopSpeech();
  }

  toggleChat() {
    this.isOpen.update(val => !val);
    if (this.isOpen()) {
      this.playContextSound('bell');
      setTimeout(() => this.scrollToBottom(), 100);
    } else {
      this.stopSpeech();
    }
  }

  toggleSound() {
    this.isSoundEnabled.update(val => !val);
    if (!this.isSoundEnabled()) {
      this.stopSpeech();
    }
  }

  sendQuickQuery(query: string) {
    this.userInput = query;
    this.sendMessage();
  }

  sendMessage() {
    const text = this.userInput.trim();
    if (!text) return;

    this.playContextSound('send');

    // Append Devotee's message
    this.messages.update(msgs => [...msgs, {
      text,
      sender: 'devotee',
      time: new Date()
    }]);

    this.userInput = '';
    this.isTyping.set(true);
    setTimeout(() => this.scrollToBottom(), 50);

    // Call Backend API
    this.apiService.sendMessageToChat(text, this.session).subscribe({
      next: (res) => {
        this.isTyping.set(false);
        const newMsgIndex = this.messages().length;
        
        // Append Bajrangi's reply
        this.messages.update(msgs => [...msgs, {
          text: res.response,
          sender: 'bajrangi',
          time: new Date()
        }]);

        setTimeout(() => this.scrollToBottom(), 50);

        // Context-aware audio handling
        const isShloka = /मनोजवं|हनुमान|राम|श्लोक|मन्त्र|आरती|aarti|shloka|chalisa|mantra/i.test(res.response);
        if (isShloka) {
          this.playContextSound('shloka');
        } else {
          this.playContextSound('receive');
        }

        if (this.isSoundEnabled()) {
          this.speakMessage(res.response, newMsgIndex);
        }
      },
      error: (err) => {
        console.error(err);
        this.isTyping.set(false);
        const replyText = 'Jai Shri Ram! Apologies, I am having trouble connecting to the temple servers. Please try again in a moment.';
        this.messages.update(msgs => [...msgs, {
          text: replyText,
          sender: 'bajrangi',
          time: new Date()
        }]);
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });
  }

  // Web Audio Synthesizer for contextual sounds (bell chime, pop, notification)
  private playContextSound(type: 'bell' | 'send' | 'receive' | 'shloka') {
    if (!this.isSoundEnabled()) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'bell' || type === 'shloka') {
        // Divine Temple Bell sound synthesis (528Hz Solfeggio frequency)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(528, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1056, ctx.currentTime + 0.1);
        osc.frequency.exponentialRampToValueAtTime(528, ctx.currentTime + 1.2);
        
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.4);
      } else if (type === 'send') {
        // Soft pop sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.08);
        
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'receive') {
        // Double soft notification chime
        [659.25, 880].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
          gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.4);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.12);
          osc.stop(ctx.currentTime + i * 0.12 + 0.4);
        });
      }
    } catch (e) {
      console.warn('Web Audio synthesis error:', e);
    }
  }

  // Voice synthesis for message reading
  speakMessage(text: string, msgIndex?: number) {
    if (!('speechSynthesis' in window)) return;
    this.stopSpeech();

    // Strip emojis for cleaner speech
    const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
    
    const utterance = new SpeechSynthesisUtterance(cleanText);
    const hasHindi = /[\u0900-\u097F]/.test(text);
    utterance.lang = hasHindi ? 'hi-IN' : 'en-US';
    utterance.rate = 0.88;

    if (msgIndex !== undefined) {
      utterance.onstart = () => this.speakingMsgIndex.set(msgIndex);
      utterance.onend = () => this.speakingMsgIndex.set(null);
      utterance.onerror = () => this.speakingMsgIndex.set(null);
    }

    window.speechSynthesis.speak(utterance);
  }

  stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.speakingMsgIndex.set(null);
  }

  private scrollToBottom() {
    const el = this.messageBody()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }
}
