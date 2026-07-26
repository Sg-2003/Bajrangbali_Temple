import { Component, signal, OnDestroy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TempleScene } from './temple-scene';
import { DevotionalAudioService } from '../../services/devotional-audio.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, TempleScene],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnDestroy {
  readonly audio = inject(DevotionalAudioService);

  currentShloka = signal({
    text: 'मनोजवं मारुततुल्यवेगं जितेन्द्रियं बुद्धिमतां वरिष्ठम्। वातात्मजं वानरयूथमुख्यं श्रीरामदूतं शरणं प्रपद्ये॥',
    translation: 'I take refuge in Sri Rama\'s messenger, Hanuman, who is swift as mind and speedier than wind, master of senses, foremost among the wise, son of Wind-God, and chief of the vanaras.'
  });

  announcements = signal([
    { title: 'Hanuman Jayanti Mahotsav 2026', date: 'April 2026', desc: 'Join us for a grand 3-day celebration with continuous Akhand Ramayan Path, Maha Aarti, and Bhandara.' },
    { title: 'Temple Renovations', date: 'Ongoing', desc: 'Donations are welcomed for the expansion of the temple assembly hall and clean drinking water facilities for devotees.' },
    { title: 'Daily Sundarkand Path', date: 'Every Saturday', desc: 'Participate in the community Sundarkand Path chanting every Saturday evening from 05:30 PM onwards.' }
  ]);

  // Expose service tracks directly
  soundTracks = this.audio.tracks;

  // Proxy signals
  get activeSoundId() { return this.audio.activeSoundId; }
  get isPlaying()     { return this.audio.isPlaying; }
  get currentTime()   { return this.audio.currentTime; }
  get duration()      { return this.audio.duration; }

  playSound(track: any) {
    this.audio.play(track.id);
  }

  pauseSound() {
    this.audio.pause();
  }

  seekSound(event: Event) {
    const input = event.target as HTMLInputElement;
    this.audio.seek(parseFloat(input.value));
  }

  formatTime(seconds: number): string {
    return this.audio.formatTime(seconds);
  }

  ngOnDestroy() {
    this.audio.stopAll();
  }
}
