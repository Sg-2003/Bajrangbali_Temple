import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DevotionalAudioService } from '../../services/devotional-audio.service';

@Component({
  selector: 'app-sundarkand',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sundarkand.html',
  styleUrl: './sundarkand.css'
})
export class Sundarkand implements OnInit, OnDestroy {
  private sanitizer = inject(DomSanitizer);
  readonly audio = inject(DevotionalAudioService);

  isHindi = signal(true);
  fontSize = signal(18); // Default font size in px
  currentVerseIndex = signal(0);

  get isAudioPlaying() { return this.audio.isPlaying; }

  // Verified YouTube video URL for Sundarkand Path
  safeVideoUrl = signal<SafeResourceUrl>('');

  verses = [
    {
      hindi: 'शान्तं शाश्वतमप्रमेयमघघ्नं निर्वाणशान्तिप्रदं।\nब्रह्माशम्भुफणीन्द्रसेव्यमनिशं वेदान्तवेद्यं विभुम्॥',
      english: 'Shantam shashvatamaprameyamaghaghnam nirvanashantipradam.\nBrahmashambhufanindrasevyamanisham vedantavedyam vibhum.',
      meaning: 'I adore the Lord of the universe, the source of peace, eternal, beyond measure, the destroyer of sins, the bestower of liberation, worshipped by Brahma, Sambhu, and Sesanaga.'
    },
    {
      hindi: 'जामवंत के बचन सुहाए। सुनि हनुमंत हृदय अति भाए॥\nतब लगि मोहि परिखेहु तुम्ह भाई। सहि दुख कंद मूल फल खाई॥',
      english: 'Jamavanta ke bachana suhae. Suni Hanumanta hridaya ati bhae.\nTaba lagi mohi parikhehu tumha bhai. Sahi dukha kanda mula fala khai.',
      meaning: 'Hearing the beautiful words of Jamavanta, Hanumanji felt immense joy in his heart. He said, "O brothers, wait for me here, bearing the hardships and surviving on roots and fruits."'
    },
    {
      hindi: 'कनक कोटि बिचित्र मनि कृत सुदिर सुंदर आयतना।\nहरि बंस कहुं गृह गृह प्रति सोहहिं अमित अमित भाय भायना॥',
      english: 'Kanaka koti bichitra mani krita sudira sundara ayatana.\nHari bansa kahu griha griha prati sohahin amita amita bhaya bhayana.',
      meaning: 'The golden walls of Lanka were decorated with diverse gems, with magnificent palaces and houses belonging to the demons, showing infinite grandeur.'
    },
    {
      hindi: 'राम नाम अंकित गृह एक दीखा। सोभा बरनि न जाइ॥\nनव तुलसी का बृंद तहं देखि हरष कपिराइ॥',
      english: 'Rama nama ankita griha eka dikha. Sobha barani na jai.\nNava tulasi ka brinda taha dekhi harasha kapirai.',
      meaning: 'Hanumanji saw a house inscribed with the name of Rama, whose beauty was beyond words. Seeing fresh Tulsi plants growing nearby, the King of Monkeys rejoiced.'
    },
    {
      hindi: 'तव अनुजहि मिलि कपि सब जाना। जनु मोहि करम कृपा भगवाना॥\nअब मोहि मारुत सुत कहु बाता। किमि देखों कोसलपति भ्राता॥',
      english: 'Tava anujahi mili kapi saba jana. Janu mohi karama kripa bhagavana.\nAba mohi maruta suta kahu bata. Kimi dekhon kosalapati bhrata.',
      meaning: 'Vibhishana said to Hanumanji, "Meeting you is like receiving the Lord\'s grace. Now, O Son of the Wind, tell me how I may behold the Lord of Kosala."'
    }
  ];

  ngOnInit() {
    const embedUrl = 'https://www.youtube.com/embed/AETFvQonfV8?rel=0&enablejsapi=1';
    this.safeVideoUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl));

    const savedBookmark = localStorage.getItem('sundarkand_bookmark');
    if (savedBookmark) {
      this.currentVerseIndex.set(parseInt(savedBookmark, 10));
    }
  }

  toggleLanguage() {
    this.isHindi.update(val => !val);
  }

  changeFontSize(amount: number) {
    this.fontSize.update(size => Math.max(14, Math.min(32, size + amount)));
  }

  nextVerse() {
    if (this.currentVerseIndex() < this.verses.length - 1) {
      this.currentVerseIndex.update(idx => idx + 1);
    }
  }

  prevVerse() {
    if (this.currentVerseIndex() > 0) {
      this.currentVerseIndex.update(idx => idx - 1);
    }
  }

  bookmarkVerse() {
    localStorage.setItem('sundarkand_bookmark', this.currentVerseIndex().toString());
    alert('Progress bookmarked successfully! Next time, you will resume from this verse. 🙏');
  }

  toggleAudio() {
    if (this.audio.isPlaying() && this.audio.activeSoundId() === 'chalisa') {
      this.audio.pause();
    } else {
      this.audio.play('chalisa');
    }
  }

  ngOnDestroy() {
    this.audio.stopAll();
  }
}
