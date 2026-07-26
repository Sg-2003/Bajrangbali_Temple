import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.css'
})
export class UserDashboard implements OnInit {
  apiService = inject(ApiService);
  authService = inject(AuthService);

  activeTab = signal('profile'); // profile, bookings, donations
  bookings = signal<any[]>([]);
  donations = signal<any[]>([]);

  // Profile Edit fields
  name = '';
  mobile = '';
  isUpdating = signal(false);
  successMsg = signal('');
  errorMsg = signal('');

  // Selected Donation for Receipt Modal
  selectedReceipt = signal<any>(null);

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.name = user.name;
      this.mobile = user.mobile || '';
    }
    this.loadData();
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
  }

  loadData() {
    this.apiService.getDevoteeBookings().subscribe({
      next: (res) => this.bookings.set(res),
      error: (err) => console.error(err)
    });

    this.apiService.getDevoteeDonations().subscribe({
      next: (res) => this.donations.set(res),
      error: (err) => console.error(err)
    });
  }

  updateProfile() {
    this.successMsg.set('');
    this.errorMsg.set('');
    this.isUpdating.set(true);

    this.apiService.updateDevoteeProfile({ name: this.name, mobile: this.mobile }).subscribe({
      next: (res) => {
        this.isUpdating.set(false);
        this.successMsg.set('Profile updated successfully!');
        // Update auth state in localstorage
        localStorage.setItem('user', JSON.stringify(res.user));
        this.authService.currentUser.set(res.user);
      },
      error: (err) => {
        this.isUpdating.set(false);
        this.errorMsg.set('Failed to update profile. Please try again.');
      }
    });
  }

  openReceipt(donation: any) {
    this.selectedReceipt.set(donation);
  }

  closeReceipt() {
    this.selectedReceipt.set(null);
  }

  printReceipt() {
    window.print();
  }
}
