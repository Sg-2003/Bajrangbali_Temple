import { Injectable, signal } from '@angular/core';

/**
 * DevotionalAudioService
 * =====================================================
 * Fast, ultra-smooth devotional audio player service.
 * - Optimized preloading & instant audio playback
 * - Zero-delay fallback to Speech Synthesis
 * - Real-time progress tracking across site
 * =====================================================
 */
@Injectable({ providedIn: 'root' })
export class DevotionalAudioService {

  activeSoundId = signal<string | null>(null);
  isPlaying     = signal(false);
  currentTime   = signal(0);
  duration      = signal(0);
  volume        = signal(0.85);

  private currentAudio: HTMLAudioElement | null = null;
  private progressTimer: any = null;

  readonly tracks = [
    {
      id: 'chalisa',
      title: 'Shree Hanuman Chalisa (श्री हनुमान चालीसा)',
      subtitle: 'Complete 40-verse sacred hymn to Bajrangbali for wisdom, strength & devotion',
      icon: '🚩',
      urls: [
        'https://archive.org/download/HanumanChalisa_201507/HanumanChalisa.mp3',
        'https://ia800301.us.archive.org/24/items/HanumanChalisa_201507/HanumanChalisa.mp3',
      ],
      mantraText: `श्रीगुरु चरन सरोज रज, निज मनु मुकुरु सुधारि। बरनउं रघूबर बिमल जसु, जो दायकु फल चारि॥ जय हनुमान ज्ञान गुन सागर। जय कपीस तिहुं लोक उजागर॥ रामदूत अतुलित बल धामा। अंजनि पुत्र पवनसुत नामा॥ महाबीर बिक्रम बजरंगी। कुमति निवार सुमति के संगी॥ कंचन बरन बिराज सुबेसा। कानन कुण्डल कुंचित केसा॥ हाथ बज्र औ ध्वजा बिराजे। कांधे मूंज जनेउ साजे॥ शंकर सुवन केसरीनंदन। तेज प्रताप महा जग बन्दन॥ विद्यावान गुनी अति चातुर। राम काज करिबे को आतुर॥ प्रभु चरित्र सुनिबे को रसिया। राम लखन सीता मन बसिया॥ जय जय जय हनुमान गोसाईं। कृपा करहु गुरुदेव की नाईं॥ जो सत बार पाठ कर कोई। छूटहि बंदि महा सुख होई॥ श्री राम जय राम जय जय राम। जय बजरंग बली॥`,
      estimatedDuration: 180
    },
    {
      id: 'beej-mantra',
      title: 'Hanuman Beej Mantra (ॐ हं हनुमते नमः)',
      subtitle: '108 potent seed chants of Bajrangbali for immense courage, health & protection',
      icon: '⚡',
      urls: [
        'https://archive.org/download/om-chanting-108-times/Om_108.mp3',
        'https://ia800301.us.archive.org/24/items/om-chanting-108-times/Om_108.mp3',
      ],
      mantraText: 'ॐ हं हनुमते नमः। ॐ हं हनुमते नमः। ॐ हं हनुमते नमः। ॐ नमो हनुमते भय भंजनाय सुख कराय। ॐ हं हनुमते नमः। ॐ श्री हनुमते नमः। जय बजरंग बली।',
      estimatedDuration: 150
    },
    {
      id: 'hanuman-ashtak',
      title: 'Sankat Mochan Hanuman Ashtak (संकटमोचन हनुमान अष्टक)',
      subtitle: '8 sacred stanzas invoking Lord Hanuman to dispel all grief, fear & obstacles',
      icon: '🛡️',
      urls: [
        'https://archive.org/download/HanumanChalisa_201507/HanumanChalisa.mp3',
        'https://ia800301.us.archive.org/24/items/HanumanChalisa_201507/HanumanChalisa.mp3',
      ],
      mantraText: 'बाल समय रबि भक्षि लियो तब, तीनहुं लोक भयो अंधियारो। ताहि सों त्रास भयो जग को, यह संकट काहु सों जात न टारो। देवन आनिके बिनती कीनी, तब छांड़ि दियो रबि कष्ट निवारो। को नहीं जानत है जग में कपि, संकटमोचन नाम तिहारो।',
      estimatedDuration: 160
    },
    {
      id: 'bajrang-baan',
      title: 'Shree Bajrang Baan (श्री बजरंग बाण)',
      subtitle: 'Powerful invokation of Hanumanji\'s arrow for swift relief & protection',
      icon: '🏹',
      urls: [
        'https://archive.org/download/RamNaamDhun/Ram_Naam_Dhun.mp3',
        'https://ia800301.us.archive.org/24/items/RamNaamDhun/Ram_Naam_Dhun.mp3',
      ],
      mantraText: 'जय हनुमंत संत हितकारी। सुनि लीजै प्रभु अरज हमारी॥ जन के काज बिलंब न कीजै। आतुर धाइ महा सुख दीजै॥ जैसे कूद सिंधु महि पारि। सुरसा बदन पैठि बिस्तारि॥ राम काज सब तुमहिं सुधारे। जय जय जय हनुमान उचारे॥',
      estimatedDuration: 170
    },
    {
      id: 'ram-hanuman-dhun',
      title: 'Sri Ram Bhakt Hanuman Dhun (जय जय हनुमान गुसाईं)',
      subtitle: 'Devotional Ram-Hanuman meditative Naam chanting for ultimate peace',
      icon: '🪔',
      urls: [
        'https://archive.org/download/RamNaamDhun/Ram_Naam_Dhun.mp3',
        'https://ia800301.us.archive.org/24/items/RamNaamDhun/Ram_Naam_Dhun.mp3',
      ],
      mantraText: 'जय राम श्री राम जय जय राम। जय हनुमान जय बजरंग बली। श्री राम जय राम जय जय राम। जय जय जय हनुमान गोसाईं कृपा करो गुरुदेव की नाईं।',
      estimatedDuration: 140
    },
    {
      id: 'temple-bell',
      title: 'Hanuman Shrine Bell & Shankh Naad (हनुमान मंदिर घंटी एवं शंख नाद)',
      subtitle: 'Sanctifying conch shell and brass bell resonance from Hanumanji\'s garbhagriha',
      icon: '🔔',
      urls: [
        'https://archive.org/download/temple-bells-india/temple_bell.mp3',
        'https://ia800301.us.archive.org/24/items/temple-bells-india/temple_bell.mp3',
      ],
      mantraText: 'ॐ... श्री हनुमान मंदिर पावन शंख एवं घण्टा नाद ध्वनि। ॐ हं हनुमते नमः। जय बजरंग बली। ॐ श्री हनुमते नमः। ॐ ॐ ॐ।',
      estimatedDuration: 75
    },
  ];

  getTrack(id: string) {
    return this.tracks.find(t => t.id === id) ?? null;
  }

  play(trackId: string) {
    const track = this.getTrack(trackId);
    if (!track) return;

    // Toggle pause if clicking already playing track
    if (this.activeSoundId() === trackId && this.isPlaying()) {
      this.pause();
      return;
    }

    this.stopAll();

    this.activeSoundId.set(trackId);
    this.currentTime.set(0);
    this.duration.set(track.estimatedDuration || 180);

    this._playAudioOrFallback(track, 0);
  }

  private _playAudioOrFallback(track: any, urlIndex: number) {
    if (urlIndex >= track.urls.length) {
      // Immediate speech synthesis recitation if all stream URLs fail
      this.speakMantra(track.mantraText, track.estimatedDuration);
      return;
    }

    const audio = new Audio();
    audio.volume = this.volume();
    audio.preload = 'auto';

    let resolved = false;

    // Fast 1.8-second load timeout for instantaneous play feel
    const loadTimeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        audio.pause();
        audio.src = '';
        this._playAudioOrFallback(track, urlIndex + 1);
      }
    }, 1800);

    audio.onloadedmetadata = () => {
      if (!isNaN(audio.duration) && audio.duration > 0) {
        this.duration.set(audio.duration);
      }
    };

    audio.ontimeupdate = () => {
      this.currentTime.set(audio.currentTime);
      if (!isNaN(audio.duration) && audio.duration > 0) {
        this.duration.set(audio.duration);
      }
    };

    audio.onended = () => {
      this.isPlaying.set(false);
      this.activeSoundId.set(null);
      this._stopTimer();
    };

    audio.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(loadTimeout);
        this._playAudioOrFallback(track, urlIndex + 1);
      }
    };

    audio.src = track.urls[urlIndex];
    this.currentAudio = audio;

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        resolved = true;
        clearTimeout(loadTimeout);
        this.isPlaying.set(true);
      }).catch(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(loadTimeout);
          this._playAudioOrFallback(track, urlIndex + 1);
        }
      });
    }
  }

  speakMantra(text: string, estimatedSecs = 180) {
    if (!('speechSynthesis' in window)) {
      this.isPlaying.set(false);
      this.activeSoundId.set(null);
      return;
    }

    try {
      window.speechSynthesis.cancel();
    } catch (_) {}

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang   = 'hi-IN';
    utterance.rate   = 0.84;
    utterance.pitch  = 0.95;
    utterance.volume = this.volume();

    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v => v.lang === 'hi-IN' || v.lang.startsWith('hi'));
    if (hindiVoice) {
      utterance.voice = hindiVoice;
    }

    this.duration.set(estimatedSecs);

    utterance.onstart = () => {
      this.isPlaying.set(true);
      this._startTimer();
    };

    utterance.onend = () => {
      this.isPlaying.set(false);
      this.activeSoundId.set(null);
      this._stopTimer();
    };

    utterance.onerror = () => {
      this.isPlaying.set(false);
      this.activeSoundId.set(null);
      this._stopTimer();
    };

    this.isPlaying.set(true);
    this._startTimer();
    window.speechSynthesis.speak(utterance);
  }

  private _startTimer() {
    this._stopTimer();
    const startTime = Date.now() - (this.currentTime() * 1000);
    this.progressTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      this.currentTime.set(elapsed);
      if (this.duration() > 0 && elapsed >= this.duration()) {
        this._stopTimer();
      }
    }, 1000);
  }

  private _stopTimer() {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
  }

  pause() {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    this._stopTimer();
    this.isPlaying.set(false);
  }

  seek(time: number) {
    this.currentTime.set(time);
    if (this.currentAudio && !isNaN(this.currentAudio.duration)) {
      this.currentAudio.currentTime = time;
    }
  }

  setVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume.set(clamped);
    if (this.currentAudio) {
      this.currentAudio.volume = clamped;
    }
  }

  stopAll() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
    this._stopTimer();
    this.isPlaying.set(false);
    this.currentTime.set(0);
    this.duration.set(0);
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
