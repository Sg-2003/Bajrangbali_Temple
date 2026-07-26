import { Component, OnInit, HostListener, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { Chatbot } from './components/chatbot/chatbot';
import { ApiService } from './services/api.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, Footer, Chatbot, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private apiService = inject(ApiService);

  title = 'Bajrangbali Hanuman Mandir Website';
  activeAnnouncement = signal<any>(null);

  ngOnInit() {
    // Initial scroll check to reveal elements currently in viewport
    setTimeout(() => {
      this.revealElements();
    }, 300);

    // Fetch announcements and check for high-priority alerts
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
    this.revealElements();
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
