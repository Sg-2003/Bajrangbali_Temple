import { Component, OnInit, signal, inject, ElementRef, viewChild, OnDestroy, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { LanguageService } from '../../services/language.service';
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
  public langService = inject(LanguageService);
  
  // Element reference for auto-scroll
  private messageBody = viewChild<ElementRef>('messageBody');

  isOpen = signal(false);
  isSoundEnabled = signal(true);
  speakingMsgIndex = signal<number | null>(null);
  session = '';
  userInput = '';
  isTyping = signal(false);

  messages = signal<Array<{ text: string, sender: 'devotee' | 'bajrangi', time: Date }>>([]);

  constructor() {
    // Pre-warm browser speech synthesis voices
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    let lastLang = this.langService.isHindi();
    effect(() => {
      const isHindi = this.langService.isHindi();
      if (isHindi !== lastLang) {
        lastLang = isHindi;
        const currentMsgs = this.messages();
        if (currentMsgs.length === 1 && currentMsgs[0].sender === 'bajrangi') {
          const updatedText = isHindi
            ? 'जय श्री राम! 🙏 मैं बजरंगी हूँ, मंदिर का एआई सहायक। आज मैं आपकी क्या सेवा कर सकता हूँ?'
            : 'Jai Shri Ram! 🙏 I am Bajrangi, the temple\'s AI assistant. How may I serve your spiritual journey today?';
          
          this.messages.set([{
            text: updatedText,
            sender: 'bajrangi',
            time: currentMsgs[0].time
          }]);
        }
      }
    });
  }

  get currentQuickPrompts() {
    if (this.langService.isHindi()) {
      return [
        { text: 'आरती का समय 🌅', query: 'आरती का समय' },
        { text: 'दान कैसे करें 🪙', query: 'दान' },
        { text: 'पूजा बुक करें 🪔', query: 'पूजा बुक करें' },
        { text: 'हनुमान श्लोक 🚩', query: 'श्लोक' }
      ];
    }
    return [
      { text: 'Aarti Timings 🌅', query: 'timings' },
      { text: 'How to Donate 🪙', query: 'donate' },
      { text: 'Book a Pooja 🪔', query: 'book pooja' },
      { text: 'Hanuman Shloka 🚩', query: 'shloka' }
    ];
  }

  ngOnInit() {
    // Generate session ID
    this.session = 'SESS-' + Math.random().toString(36).substring(2, 11).toUpperCase();
    
    // Initial greeting based on active site language
    const greeting = this.langService.isHindi()
      ? 'जय श्री राम! 🙏 मैं बजरंगी हूँ, मंदिर का एआई सहायक। आज मैं आपकी क्या सेवा कर सकता हूँ?'
      : 'Jai Shri Ram! 🙏 I am Bajrangi, the temple\'s AI assistant. How may I serve your spiritual journey today?';

    this.messages.set([
      {
        text: greeting,
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

    // Get current language ('en' | 'hi')
    const lang = this.langService.currentLang();

    // Call Backend API
    this.apiService.sendMessageToChat(text, this.session, lang).subscribe({
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
          setTimeout(() => {
            // Read rendered translated text from DOM if available
            const msgParagraphs = this.messageBody()?.nativeElement.querySelectorAll('.chat-msg-bubble p');
            let textToSpeak = res.response;
            if (msgParagraphs && msgParagraphs.length > newMsgIndex) {
              textToSpeak = msgParagraphs[newMsgIndex].innerText || res.response;
            }
            this.speakMessage(textToSpeak, newMsgIndex);
          }, 300);
        }
      },
      error: (err) => {
        console.error(err);
        this.isTyping.set(false);
        const replyText = this.langService.isHindi()
          ? 'जय श्री राम! क्षमा करें, मंदिर सर्वर से जुड़ने में समस्या आ रही है। कृपया कुछ क्षणों में पुनः प्रयास करें।'
          : 'Jai Shri Ram! Apologies, I am having trouble connecting to the temple servers. Please try again in a moment.';
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

  // Voice synthesis for message reading (Reads translated text as per current language)
  speakMessage(text: string, msgIndex?: number) {
    if (!('speechSynthesis' in window)) return;
    this.stopSpeech();

    // Strip emojis & extra whitespace for clean voice output
    const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Detect if active language or text is Hindi (via LanguageService, Google Translate cookie, or Devanagari script)
    const isGoogleTransHindi = typeof document !== 'undefined' && 
      (document.cookie.includes('googtrans=/en/hi') || document.documentElement.classList.contains('translated-ltr'));
    const isDevanagari = /[\u0900-\u097F]/.test(cleanText);
    const isHindiMode = this.langService.isHindi() || isGoogleTransHindi || isDevanagari;

    if (isHindiMode) {
      utterance.lang = 'hi-IN';
      utterance.rate = 0.9;

      const voices = window.speechSynthesis.getVoices();
      const hindiVoice = voices.find(v => 
        v.lang.includes('hi-IN') || 
        v.lang.includes('hi') || 
        v.name.toLowerCase().includes('hindi') || 
        v.name.toLowerCase().includes('kalpana') || 
        v.name.toLowerCase().includes('hemant') ||
        v.name.toLowerCase().includes('google हिन्दी')
      );
      if (hindiVoice) {
        utterance.voice = hindiVoice;
      }
    } else {
      utterance.lang = 'en-US';
      utterance.rate = 0.88;

      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('en-US'));
      if (enVoice) {
        utterance.voice = enVoice;
      }
    }

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
