import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-live-darshan',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './live-darshan.html',
  styleUrl: './live-darshan.css'
})
export class LiveDarshan implements OnInit, OnDestroy {
  authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  viewerCount = signal(142);
  chatInput = '';
  safeVideoUrl = signal<SafeResourceUrl>('');

  chatMessages = signal<Array<{ sender: string; text: string; time: string; isUser: boolean }>>([
    { sender: 'Rohan Sharma', text: 'Jai Shri Ram! 🙏', time: '10:00 AM', isUser: false },
    { sender: 'Priya Patel', text: 'Stunning shringar of Bajrangbali today.', time: '10:01 AM', isUser: false },
    { sender: 'Sanjay Gupta', text: 'Har Har Mahadev! Greetings from Varanasi.', time: '10:02 AM', isUser: false }
  ]);

  private countInterval: any;
  private chatInterval: any;

  simulatedSenders = ['Vikram Singh', 'Neha Dubey', 'Rajesh Mishra', 'Kunal Verma', 'Sunita Rao', 'Aman Joshi'];
  simulatedTexts = [
    'Jai Bajrangbali! Please bless my family.',
    'Sankat Mochan Hanumante pranam. 🌸',
    'Jai Shri Ram from Jamshedpur!',
    'Mangala aarti was so peaceful today.',
    'Gau Seva prasad details please?',
    'Beautiful view. Jai Hanuman!'
  ];

  ngOnInit() {
    const embedUrl = `https://www.youtube.com/embed/AETFvQonfV8?autoplay=1&mute=1`;
    this.safeVideoUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl));

    // Dynamic viewer count simulator
    this.countInterval = setInterval(() => {
      const delta = Math.floor(Math.random() * 9) - 4; // +/- 4
      this.viewerCount.update(c => Math.max(10, c + delta));
    }, 4000);

    // Dynamic chat simulator
    this.chatInterval = setInterval(() => {
      const randomSender = this.simulatedSenders[Math.floor(Math.random() * this.simulatedSenders.length)];
      const randomText = this.simulatedTexts[Math.floor(Math.random() * this.simulatedTexts.length)];
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      this.chatMessages.update(msgs => [...msgs, {
        sender: randomSender,
        text: randomText,
        time: timeStr,
        isUser: false
      }]);
    }, 6000);
  }

  sendChatMessage() {
    const text = this.chatInput.trim();
    if (!text) return;

    const user = this.authService.currentUser();
    const senderName = user ? user.name : 'Anonymous Devotee';
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    this.chatMessages.update(msgs => [...msgs, {
      sender: senderName,
      text: text,
      time: timeStr,
      isUser: true
    }]);

    this.chatInput = '';
  }

  ngOnDestroy() {
    if (this.countInterval) clearInterval(this.countInterval);
    if (this.chatInterval) clearInterval(this.chatInterval);
  }
}
