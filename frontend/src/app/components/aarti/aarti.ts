import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { DevotionalAudioService } from '../../services/devotional-audio.service';

@Component({
  selector: 'app-aarti',
  standalone: true,
  templateUrl: './aarti.html',
  styleUrl: './aarti.css'
})
export class Aarti implements OnInit, OnDestroy {
  readonly audio = inject(DevotionalAudioService);

  // Proxy signals from service
  get isPlaying()   { return this.audio.isPlaying; }
  get currentTime() { return this.audio.currentTime; }
  get duration()    { return this.audio.duration; }
  isMuted = signal(false);

  aartiList = [
    { name: 'Mangala Aarti', time: '06:30 AM', desc: 'The morning awakening ritual to begin the day with divine vibrations.' },
    { name: 'Bhog Aarti', time: '12:00 PM', desc: 'Mid-day offering of Prasad, sweets, and fruits to Bajrangbali.' },
    { name: 'Sandhya Aarti', time: '07:00 PM', desc: 'The grand evening prayer with lamps, bells, and community chanting.' },
    { name: 'Shayan Aarti', time: '08:30 PM', desc: 'The closing ritual of the day before the deity retires.' }
  ];

  nextAartiName   = signal('');
  countdownString  = signal('00:00:00');
  isAartiActive   = signal(false);
  autoPlayNotice  = signal(false);

  private timerId: any;
  private currentActiveAartiSlot: string | null = null;

  ngOnInit() {
    this.updateTimer();
    this.timerId = setInterval(() => this.updateTimer(), 1000);
  }

  ngOnDestroy() {
    if (this.timerId) clearInterval(this.timerId);
    this.audio.stopAll();
  }

  // ─── Audio Controls ───────────────────────────────
  togglePlay() {
    if (this.audio.isPlaying() && this.audio.activeSoundId() === 'chalisa') {
      this.audio.pause();
      this.autoPlayNotice.set(false);
    } else {
      this.audio.play('chalisa');
    }
  }

  toggleMute() {
    const muted = !this.isMuted();
    this.isMuted.set(muted);
    this.audio.setVolume(muted ? 0 : 0.85);
  }

  seekAudio(event: Event) {
    const input = event.target as HTMLInputElement;
    this.audio.seek(parseFloat(input.value));
  }

  formatTime(seconds: number): string {
    return this.audio.formatTime(seconds);
  }

  // Simulate Aarti Time Auto-Play for live testing
  triggerTestAartiAutoPlay() {
    this.isAartiActive.set(true);
    this.autoPlayNotice.set(true);
    this.nextAartiName.set('Live Sandhya Aarti');
    this.countdownString.set('Currently Happening! 🪔');
    this.audio.play('chalisa');
  }

  // ─── Aarti Countdown & Autoplay Timer ─────────────
  private updateTimer() {
    const now = new Date();
    const times = [
      { name: 'Mangala Aarti', hour: 6,  minute: 30 },
      { name: 'Bhog Aarti',    hour: 12, minute: 0  },
      { name: 'Sandhya Aarti', hour: 19, minute: 0  },
      { name: 'Shayan Aarti',  hour: 20, minute: 30 }
    ];

    let nextAarti = null;
    let targetDate = new Date();

    for (const t of times) {
      const aartiTime = new Date();
      aartiTime.setHours(t.hour, t.minute, 0, 0);
      if (now < aartiTime) { nextAarti = t; targetDate = aartiTime; break; }
    }

    if (!nextAarti) {
      nextAarti = times[0];
      targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 1);
      targetDate.setHours(times[0].hour, times[0].minute, 0, 0);
    }

    let active = false;
    let activeName = '';

    for (const t of times) {
      const start = new Date(); start.setHours(t.hour, t.minute, 0, 0);
      const end   = new Date(start.getTime() + 30 * 60 * 1000); // 30 min window
      if (now >= start && now <= end) {
        active = true;
        activeName = t.name;
        this.nextAartiName.set(t.name);
        this.countdownString.set('Currently Happening! 🪔');
        break;
      }
    }

    // AUTO-PLAY LOGIC: When an Aarti becomes active, trigger audio automatically
    if (active) {
      if (this.currentActiveAartiSlot !== activeName) {
        this.currentActiveAartiSlot = activeName;
        this.autoPlayNotice.set(true);
        // Automatically start sacred Aarti audio
        if (!this.audio.isPlaying()) {
          this.audio.play('chalisa');
        }
      }
    } else {
      this.currentActiveAartiSlot = null;
    }

    // If manual test autoplay is running, keep active state true
    if (!this.autoPlayNotice()) {
      this.isAartiActive.set(active);
    }

    if (!active && !this.autoPlayNotice()) {
      this.nextAartiName.set(nextAarti.name);
      const diffMs  = targetDate.getTime() - now.getTime();
      const hours   = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      const pad = (n: number) => n.toString().padStart(2, '0');
      this.countdownString.set(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    }
  }
}
