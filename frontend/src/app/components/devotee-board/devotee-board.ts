import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-devotee-board',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './devotee-board.html',
  styleUrl: './devotee-board.css'
})
export class DevoteeBoard implements OnInit {
  private apiService = inject(ApiService);

  prayers = signal<any[]>([]);
  isLoading = signal(true);

  // Form Fields
  devoteeName = '';
  message = '';

  successMessage = signal('');
  errorMessage = signal('');
  isSubmitting = signal(false);

  ngOnInit() {
    this.fetchPrayers();
  }

  fetchPrayers() {
    this.isLoading.set(true);
    this.apiService.getPrayers().subscribe({
      next: (data) => {
        this.prayers.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  submitPrayer() {
    if (!this.devoteeName || !this.message) {
      this.errorMessage.set('Please fill out both your name and prayer message.');
      return;
    }

    this.isSubmitting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const newPrayer = {
      devoteeName: this.devoteeName,
      message: this.message
    };

    this.apiService.createPrayer(newPrayer).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successMessage.set('Jai Hanuman! Your prayer has been posted on the wall.');
        
        // Prepend the new prayer to local list so it updates instantly
        const savedPrayer = res.prayer;
        this.prayers.update(current => [savedPrayer, ...current]);

        // Reset form
        this.devoteeName = '';
        this.message = '';

        // Clear success message after 4 seconds
        setTimeout(() => {
          this.successMessage.set('');
        }, 4000);
      },
      error: (err) => {
        console.error(err);
        this.isSubmitting.set(false);
        this.errorMessage.set('Failed to submit prayer. Please try again.');
      }
    });
  }
}
