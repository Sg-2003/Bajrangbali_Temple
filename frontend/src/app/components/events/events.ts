import { Component, OnInit, signal, inject } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './events.html',
  styleUrl: './events.css'
})
export class Events implements OnInit {
  private apiService = inject(ApiService);

  events = signal<any[]>([]);
  isLoading = signal(true);

  fallbackEvents = [
    { title: 'Hanuman Jayanti Mahotsav', description: 'Join us for a grand 3-day celebration with continuous Akhand Ramayan Path, Maha Aarti, and community Bhandara (food distribution) serving thousands of devotees.', date: new Date('2026-04-12T09:00:00'), banner: '/gallery_jayanti.png' },
    { title: 'Ram Navami Celebrations', description: 'A sacred havan and special shringar ritual to mark the auspicious birth of Lord Rama. Devotional bhajan sandhya will start in the evening.', date: new Date('2026-03-28T07:00:00'), banner: '/gallery_maha.png' },
    { title: 'Weekly Sundarkand Path', description: 'Participate in the community chanting of Sundarkand every Saturday evening for courage, peace, and spiritual strength. Prasad is distributed after Aarti.', date: new Date('2026-07-25T17:30:00'), banner: '/gallery_sundarkand.png' }
  ];

  ngOnInit() {
    this.fetchEvents();
  }

  fetchEvents() {
    this.isLoading.set(true);
    this.apiService.getEvents().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.events.set(data);
        } else {
          this.events.set(this.fallbackEvents);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching events:', err);
        this.events.set(this.fallbackEvents);
        this.isLoading.set(false);
      }
    });
  }
}
