import { Component, AfterViewInit, HostListener, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { ChatbotLoader } from './components/chatbot/chatbot-loader';
import { ApiService } from './services/api.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, Footer, ChatbotLoader, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements AfterViewInit {
  private apiService = inject(ApiService);

  title = 'Bajrangbali Hanuman Mandir Website';
  activeAnnouncement = signal<any>(null);
  private scrollTicking = false;

  ngAfterViewInit() {
    this.revealElements();

    this.apiService.getAnnouncements().subscribe({
      next: (res) => {
        const highAlert = res.find(a => a.priority === 'high');
        if (highAlert) {
          this.activeAnnouncement.set(highAlert);
        }
      },
      error: (err) => console.error('Error fetching alerts:', err)
    });
  }

  closeAnnouncement() {
    this.activeAnnouncement.set(null);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (!this.scrollTicking) {
      this.scrollTicking = true;
      requestAnimationFrame(() => {
        this.revealElements();
        this.scrollTicking = false;
      });
    }
  }

  private revealElements() {
    const reveals = document.querySelectorAll('.reveal');
    const windowHeight = window.innerHeight;
    const revealPoint = 100;

    reveals.forEach((el: any) => {
      const revealTop = el.getBoundingClientRect().top;
      if (revealTop < windowHeight - revealPoint) {
        el.classList.add('active');
      }
    });
  }
}
