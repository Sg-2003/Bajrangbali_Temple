import { Component, signal, OnDestroy, inject } from '@angular/core';
import { DevotionalAudioService } from '../../services/devotional-audio.service';

@Component({
  selector: 'app-chalisa',
  standalone: true,
  templateUrl: './chalisa.html',
  styleUrl: './chalisa.css'
})
export class Chalisa implements OnDestroy {
  readonly audio = inject(DevotionalAudioService);

  // Proxy state from service
  get isPlaying()   { return this.audio.isPlaying; }
  get currentTime() { return this.audio.currentTime; }
  get duration()    { return this.audio.duration; }
  isMuted = signal(false);
  volume = signal(1);
  playbackSpeed = signal(1);
  playingVerseKey = signal<string | null>(null);
  isRecitingSpeech = signal(false);

  selectedView = signal<'devanagari' | 'english' | 'both'>('both');

  dohas = [
    {
      id: 'doha-1',
      hindi: 'श्रीगुरु चरन सरोज रज, निज मनु मुकुरु सुधारि।\nबरनउं रघूबर बिमल जसु, जो दायकु फल चारि॥',
      english: 'Shree Guru Charan Saroj Raj, Nij Manu Mukur Sudhaari,\nBaranau Raghuvar Bimal Jasu, Jo Daayaku Phal Chaari.',
      meaning: 'Having cleansed the mirror of my mind with the dust of my Guru\'s lotus feet, I sing the pure glory of Lord Rama, which bestows the four ultimate fruits of life.'
    },
    {
      id: 'doha-2',
      hindi: 'बुद्धिहीन तनु जानिके, सुमिरौं पवन-कुमार।\nबल बुधि बिद्या देहु मोहि, हरहु कलेस बिकार॥',
      english: 'Budhiheen Tanu Jaanike, Sumirau Pavan-Kumaar,\nBal Budhi Bidya Dehu Mohi, Harahu Kales Bikaar.',
      meaning: 'Knowing myself to be ignorant, I meditate upon you, O Son of Wind! Grant me strength, wisdom, and knowledge, and remove all my afflictions and impurities.'
    }
  ];

  chaupais = [
    {
      num: 1,
      id: 'chaupai-1',
      hindi: 'जय हनुमान ज्ञान गुन सागर। जय कपीस तिहुं लोक उजागर॥',
      english: 'Jai Hanuman Gyan Gun Sagar, Jai Kapees Tihun Lok Ujagar.',
      meaning: 'Victory to you, O Hanuman, ocean of wisdom and virtue! Victory to the Lord of Monkeys, who illuminates the three worlds!'
    },
    {
      num: 2,
      id: 'chaupai-2',
      hindi: 'रामदूत अतुलित बल धामा। अंजनि-पुत्र पवनसुत नामा॥',
      english: 'Ramdoot Atulit Bal Dhama, Anjani-Putra Pavansut Nama.',
      meaning: 'You are the messenger of Lord Rama, the abode of matchless power. You are known as Anjani\'s son and the child of the Wind-God.'
    },
    {
      num: 3,
      id: 'chaupai-3',
      hindi: 'महाबीर बिक्रम बजरंगी। कुमति निवार सुमति के संगी॥',
      english: 'Mahaveer Bikram Bajrangi, Kumati Nivar Sumati Ke Sangi.',
      meaning: 'Great hero of exceptional valour, with limbs as strong as thunderbolt! You dispel negative thoughts and associate with the wise and virtuous.'
    },
    {
      num: 4,
      id: 'chaupai-4',
      hindi: 'कंचन बरन बिराज सुबेसा। कानन कुंडल कुंचित केसा॥',
      english: 'Kanchan Baran Biraj Subesa, Kanan Kundal Kunchit Kesa.',
      meaning: 'Your golden complexion shines bright, and you are beautifully adorned with ear-studs and curly locks.'
    },
    {
      num: 5,
      id: 'chaupai-5',
      hindi: 'हाथ बज्र औ ध्वजा बिराजै। कांधे मूंज जनेऊ साजै॥',
      english: 'Haath Bajra Au Dhvaja Birajai, Kaandhe Moonj Janeoo Saajai.',
      meaning: 'In your hands shine a mace and a flag, and your shoulder is adorned with the sacred thread made of Munja grass.'
    },
    {
      num: 6,
      id: 'chaupai-6',
      hindi: 'शंकर सुवन केसरीनंदन। तेज प्रताप महा जग बन्दन॥',
      english: 'Shankar Suvan Kesari Nandan, Tej Pratap Maha Jag Bandan.',
      meaning: 'You are an incarnation of Lord Shiva and the son of Kesari. Your radiant power and glory are praised by the entire universe.'
    },
    {
      num: 7,
      id: 'chaupai-7',
      hindi: 'विद्यावान गुनी अति चातुर। राम काज करिबे को आतुर॥',
      english: 'Vidyavan Guni Ati Chatur, Ram Kaaj Karibe Ko Aatur.',
      meaning: 'You are highly educated, full of virtuous qualities, and exceptionally clever. You are always eager to perform Lord Rama\'s work.'
    },
    {
      num: 8,
      id: 'chaupai-8',
      hindi: 'प्रभु चरित्र सुनिबे को रसिया। राम लखन सीता मन बसिया॥',
      english: 'Prabhu Charitra Sunibe Ko Rasiya, Ram Lakhan Sita Man Basiya.',
      meaning: 'You delight in listening to the stories of Lord Rama. In your heart reside Lord Rama, Lakshmana, and Mother Sita.'
    }
  ];

  ngOnDestroy() {
    this.audio.stopAll();
    this.stopSpeech();
  }

  // Main Audio Player Controls
  togglePlay() {
    if (this.isRecitingSpeech()) {
      this.stopSpeech();
      return;
    }
    if (this.audio.isPlaying() && this.audio.activeSoundId() === 'chalisa') {
      this.audio.pause();
    } else {
      this.audio.play('chalisa');
    }
  }

  onTimeUpdate() {}
  onLoadedMetadata() {}
  onAudioEnded()    { this.audio.isPlaying.set(false); this.audio.currentTime.set(0); }
  onAudioError()    { this.audio.play('chalisa'); }

  seekAudio(event: Event) {
    const input = event.target as HTMLInputElement;
    this.audio.seek(parseFloat(input.value));
  }

  toggleMute() {
    const muted = !this.isMuted();
    this.isMuted.set(muted);
    this.audio.setVolume(muted ? 0 : this.volume());
  }

  onVolumeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = parseFloat(input.value);
    this.volume.set(val);
    this.audio.setVolume(val);
    this.isMuted.set(val === 0);
  }

  setSpeed(speed: number) {
    this.playbackSpeed.set(speed);
  }

  formatTime(seconds: number): string {
    return this.audio.formatTime(seconds);
  }

  // Sequential full Hanuman Chalisa speech recitation engine
  startFullRecitation() {
    this.stopSpeech();
    this.isPlaying.set(true);
    this.isRecitingSpeech.set(true);

    const allVerses = [
      ...this.dohas.map(d => ({ text: d.hindi, key: d.id })),
      ...this.chaupais.map(c => ({ text: c.hindi, key: c.id })),
      { text: 'पवनतनय संकट हरन, मंगल मूरति रूप। राम लखन सीता सहित, हृदय बसहु सुर भूप॥', key: 'final-doha' }
    ];

    let currentIndex = 0;

    const speakNext = () => {
      if (currentIndex >= allVerses.length || !this.isRecitingSpeech()) {
        this.isPlaying.set(false);
        this.isRecitingSpeech.set(false);
        this.playingVerseKey.set(null);
        return;
      }

      const verse = allVerses[currentIndex];
      this.playingVerseKey.set(verse.key);

      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(verse.text);
        utterance.lang = 'hi-IN';
        utterance.rate = 0.85;

        utterance.onend = () => {
          currentIndex++;
          speakNext();
        };

        utterance.onerror = () => {
          currentIndex++;
          speakNext();
        };

        window.speechSynthesis.speak(utterance);
      } else {
        this.isPlaying.set(false);
        this.isRecitingSpeech.set(false);
      }
    };

    speakNext();
  }

  // Per-Verse Recitation (Web Speech API Audio Synthesis)
  speakVerse(text: string, key: string) {
    if (this.audio.isPlaying()) {
      this.audio.pause();
    }

    if (this.playingVerseKey() === key) {
      this.stopSpeech();
      return;
    }

    this.stopSpeech();

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'hi-IN';
      utterance.rate = 0.85;

      utterance.onstart = () => {
        this.playingVerseKey.set(key);
      };

      utterance.onend = () => {
        this.playingVerseKey.set(null);
      };

      utterance.onerror = () => {
        this.playingVerseKey.set(null);
      };

      window.speechSynthesis.speak(utterance);
    }
  }

  stopSpeech() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isRecitingSpeech.set(false);
    this.playingVerseKey.set(null);
  }

  changeView(view: 'devanagari' | 'english' | 'both') {
    this.selectedView.set(view);
  }

  downloadPDF() {
    window.print();
  }
}

