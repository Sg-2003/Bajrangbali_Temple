import { Injectable, signal, computed } from '@angular/core';

export type Language = 'en' | 'hi';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  currentLang = signal<Language>('en');

  isHindi = computed(() => this.currentLang() === 'hi');

  private translations: Record<string, { en: string; hi: string }> = {
    // Navbar Items
    'nav.home': { en: 'Home', hi: 'मुख्य पृष्ठ' },
    'nav.about': { en: 'About', hi: 'हमारे बारे में' },
    'nav.aarti': { en: 'Aarti', hi: 'आरती' },
    'nav.chalisa': { en: 'Chalisa', hi: 'चालीसा' },
    'nav.sundarkand': { en: 'Sundarkand', hi: 'सुंदरकांड' },
    'nav.darshan': { en: 'Darshan', hi: 'लाइव दर्शन' },
    'nav.events': { en: 'Events', hi: 'कार्यक्रम' },
    'nav.services': { en: 'Pujas', hi: 'पूजाएं' },
    'nav.gallery': { en: 'Gallery', hi: 'गैलरी' },
    'nav.devotees': { en: 'Prayers', hi: 'प्रार्थनाएं' },
    'nav.contact': { en: 'Contact', hi: 'संपर्क' },
    'nav.login': { en: 'Login', hi: 'लॉगिन' },
    'nav.logout': { en: 'Logout', hi: 'लॉगआउट' },
    'nav.admin': { en: 'Admin', hi: 'एडमिन' },
    'nav.dashboard': { en: 'Dashboard', hi: 'डैशबोर्ड' },
    'nav.donate': { en: 'Donate', hi: 'दान करें' },
    
    // Logo & Header
    'logo.hindi': { en: 'श्री हनुमान मंदिर', hi: 'श्री हनुमान मंदिर' },
    'logo.english': { en: 'Hanuman Mandir', hi: 'हनुमान मंदिर (पोटका)' }
  };

  constructor() {
    const savedLang = localStorage.getItem('lang');
    if (savedLang === 'hi' || savedLang === 'hindi') {
      this.currentLang.set('hi');
      queueMicrotask(() => this.applyTranslate('hi'));
    } else {
      this.currentLang.set('en');
    }
  }

  toggleLanguage() {
    const nextLang: Language = this.currentLang() === 'en' ? 'hi' : 'en';
    this.currentLang.set(nextLang);
    localStorage.setItem('lang', nextLang);
    this.applyTranslate(nextLang);
  }

  setLanguage(lang: Language) {
    this.currentLang.set(lang);
    localStorage.setItem('lang', lang);
    this.applyTranslate(lang);
  }

  t(key: string): string {
    const item = this.translations[key];
    if (!item) return key;
    return item[this.currentLang()];
  }

  private applyTranslate(lang: Language) {
    const targetCode = lang === 'hi' ? '/en/hi' : '/en/en';
    const domain = window.location.hostname;
    
    document.cookie = `googtrans=${targetCode}; path=/; domain=${domain}`;
    document.cookie = `googtrans=${targetCode}; path=/;`;

    const combo = document.querySelector('.goog-te-combo') as HTMLSelectElement;
    if (combo) {
      combo.value = lang === 'hi' ? 'hi' : 'en';
      combo.dispatchEvent(new Event('change'));
    }
  }
}
