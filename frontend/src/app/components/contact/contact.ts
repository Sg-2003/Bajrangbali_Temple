import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css'
})
export class Contact {
  private apiService = inject(ApiService);

  // Form Fields
  name = '';
  email = '';
  subject = '';
  message = '';

  successMessage = signal('');
  errorMessage = signal('');
  isSubmitting = signal(false);

  submitContact() {
    if (!this.name || !this.email || !this.message) {
      this.errorMessage.set('Please fill out all required fields (*)');
      return;
    }

    this.isSubmitting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    const contactData = {
      name: this.name,
      email: this.email,
      subject: this.subject,
      message: this.message
    };

    this.apiService.submitContact(contactData).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.successMessage.set('Thank you for contacting us! Your inquiry has been received. Jai Bajrangbali!');
        this.resetForm();
      },
      error: (err) => {
        console.error(err);
        this.isSubmitting.set(false);
        this.errorMessage.set('Failed to send message. Please try again later.');
      }
    });
  }

  resetForm() {
    this.name = '';
    this.email = '';
    this.subject = '';
    this.message = '';
  }
}
