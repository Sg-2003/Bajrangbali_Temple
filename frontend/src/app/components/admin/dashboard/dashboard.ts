import { Component, OnInit, signal, inject } from '@angular/core';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../core/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe, TitleCasePipe, LowerCasePipe } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [FormsModule, DatePipe, DecimalPipe, TitleCasePipe, LowerCasePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class AdminDashboard implements OnInit {
  private apiService = inject(ApiService);
  authService = inject(AuthService);
  private router = inject(Router);

  // UI State
  activeTab = signal<string>('stats');
  isLoading = signal<boolean>(true);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  // Stats Data
  stats = signal<any>({
    cards: {
      totalDonations: 0,
      todayDonations: 0,
      totalBookings: 0,
      totalEvents: 0,
      totalGallery: 0,
      totalContacts: 0,
      totalUsers: 0
    },
    bookingStats: [],
    monthlyDonations: []
  });

  // Collections Data
  bookings = signal<any[]>([]);
  donations = signal<any[]>([]);
  galleryItems = signal<any[]>([]);
  events = signal<any[]>([]);
  contacts = signal<any[]>([]);
  users = signal<any[]>([]);
  pujas = signal<any[]>([]);
  announcements = signal<any[]>([]);

  // Search Filter States
  donationSearch = signal<string>('');
  bookingFilter = signal<string>('All');

  // Forms State
  // Gallery
  galleryTitle = '';
  galleryCategory = 'Rituals';
  galleryFile: File | null = null;
  // Event
  eventTitle = '';
  eventDesc = '';
  eventDate = '';
  eventFile: File | null = null;
  // Puja Offering
  pujaTitle = '';
  pujaDesc = '';
  pujaPrice = 0;
  pujaDuration = '30 mins';
  editingPujaId = signal<string | null>(null);
  // Announcement
  annTitle = '';
  annDesc = '';
  annPriority = 'medium';

  ngOnInit() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadAllData();
  }

  loadAllData() {
    this.isLoading.set(true);
    this.errorMessage.set('');
    
    // Fetch stats
    this.apiService.getAdminStats().subscribe({
      next: (statsData) => {
        this.stats.set(statsData);
      },
      error: (err) => console.error('Stats loading failed', err)
    });

    // Fetch Bookings
    this.apiService.getBookings().subscribe({
      next: (data) => this.bookings.set(data),
      error: (err) => console.error(err)
    });

    // Fetch Donations
    this.apiService.getDonations().subscribe({
      next: (data) => this.donations.set(data),
      error: (err) => console.error(err)
    });

    // Fetch Gallery
    this.apiService.getGallery().subscribe({
      next: (data) => this.galleryItems.set(data),
      error: (err) => console.error(err)
    });

    // Fetch Events
    this.apiService.getEvents().subscribe({
      next: (data) => this.events.set(data),
      error: (err) => console.error(err)
    });

    // Fetch Devotee Users
    this.apiService.getUsers().subscribe({
      next: (data) => this.users.set(data),
      error: (err) => console.error(err)
    });

    // Fetch Dynamic Puja List
    this.apiService.getPujas().subscribe({
      next: (data) => this.pujas.set(data),
      error: (err) => console.error(err)
    });

    // Fetch Announcements
    this.apiService.getAnnouncements().subscribe({
      next: (data) => this.announcements.set(data),
      error: (err) => console.error(err)
    });

    // Fetch Contacts
    this.apiService.getContacts().subscribe({
      next: (data) => {
        this.contacts.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.isLoading.set(false);
      }
    });
  }

  setTab(tab: string) {
    this.activeTab.set(tab);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  // Booking Actions
  updateBookingStatus(id: string, status: string) {
    this.apiService.updateBookingStatus(id, status).subscribe({
      next: () => {
        this.successMessage.set(`Booking status updated to ${status}.`);
        this.loadAllData();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: () => this.errorMessage.set('Failed to update booking status.')
    });
  }

  updateBookingPaymentStatus(id: string, paymentStatus: string) {
    this.apiService.updateBookingPaymentStatus(id, paymentStatus).subscribe({
      next: () => {
        this.successMessage.set(`Payment status updated to ${paymentStatus}.`);
        this.loadAllData();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: () => this.errorMessage.set('Failed to update payment status.')
    });
  }

  // User Management Actions
  toggleUserSuspension(id: string) {
    this.apiService.toggleUserSuspension(id).subscribe({
      next: () => {
        this.successMessage.set('Devotee suspension status toggled.');
        this.loadAllData();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => this.errorMessage.set(err.error?.error || 'Failed to update user suspension.')
    });
  }

  deleteUser(id: string) {
    if (!confirm('Are you sure you want to delete this devotee profile? This cannot be undone.')) return;
    this.apiService.deleteUser(id).subscribe({
      next: () => {
        this.successMessage.set('Devotee profile deleted successfully.');
        this.loadAllData();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: (err) => this.errorMessage.set(err.error?.error || 'Failed to delete user.')
    });
  }

  // Dynamic Pujas Actions
  addOrUpdatePuja() {
    if (!this.pujaTitle || !this.pujaPrice) {
      this.errorMessage.set('Puja title and price are required.');
      return;
    }

    const pujaData = {
      title: this.pujaTitle,
      description: this.pujaDesc,
      price: this.pujaPrice,
      duration: this.pujaDuration
    };

    if (this.editingPujaId()) {
      this.apiService.updatePuja(this.editingPujaId()!, pujaData).subscribe({
        next: () => {
          this.successMessage.set('Puja offering updated successfully!');
          this.resetPujaForm();
          this.loadAllData();
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: () => this.errorMessage.set('Failed to update puja details.')
      });
    } else {
      this.apiService.createPuja(pujaData).subscribe({
        next: () => {
          this.successMessage.set('Puja offering created successfully!');
          this.resetPujaForm();
          this.loadAllData();
          setTimeout(() => this.successMessage.set(''), 3000);
        },
        error: () => this.errorMessage.set('Failed to create puja.')
      });
    }
  }

  editPuja(puja: any) {
    this.editingPujaId.set(puja._id);
    this.pujaTitle = puja.title;
    this.pujaDesc = puja.description;
    this.pujaPrice = puja.price;
    this.pujaDuration = puja.duration;
  }

  deletePuja(id: string) {
    if (!confirm('Are you sure you want to delete this puja offering?')) return;
    this.apiService.deletePuja(id).subscribe({
      next: () => {
        this.successMessage.set('Puja offering deleted.');
        this.loadAllData();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: () => this.errorMessage.set('Failed to delete puja.')
    });
  }

  resetPujaForm() {
    this.editingPujaId.set(null);
    this.pujaTitle = '';
    this.pujaDesc = '';
    this.pujaPrice = 0;
    this.pujaDuration = '30 mins';
  }

  // Announcements Actions
  publishAnnouncement() {
    if (!this.annTitle || !this.annDesc) {
      this.errorMessage.set('Announcement title and description are required.');
      return;
    }

    const annData = {
      title: this.annTitle,
      description: this.annDesc,
      priority: this.annPriority
    };

    this.apiService.createAnnouncement(annData).subscribe({
      next: () => {
        this.successMessage.set('Announcement alert published successfully!');
        this.annTitle = '';
        this.annDesc = '';
        this.annPriority = 'medium';
        this.loadAllData();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: () => this.errorMessage.set('Failed to publish announcement.')
    });
  }

  deleteAnnouncement(id: string) {
    if (!confirm('Are you sure you want to withdraw this announcement?')) return;
    this.apiService.deleteAnnouncement(id).subscribe({
      next: () => {
        this.successMessage.set('Announcement alert withdrawn.');
        this.loadAllData();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: () => this.errorMessage.set('Failed to delete announcement.')
    });
  }

  // File Handlers
  onGalleryFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.galleryFile = event.target.files[0];
    }
  }

  onEventFileSelected(event: any) {
    if (event.target.files && event.target.files.length > 0) {
      this.eventFile = event.target.files[0];
    }
  }

  // Add Gallery Item
  addGalleryItem() {
    if (!this.galleryTitle || !this.galleryCategory) {
      this.errorMessage.set('Please fill out all gallery fields.');
      return;
    }

    const formData = new FormData();
    formData.append('title', this.galleryTitle);
    formData.append('category', this.galleryCategory);
    if (this.galleryFile) {
      formData.append('imageFile', this.galleryFile);
    }

    this.isLoading.set(true);
    this.apiService.addGalleryItem(formData).subscribe({
      next: () => {
        this.successMessage.set('Gallery item uploaded successfully!');
        this.galleryTitle = '';
        this.galleryFile = null;
        this.loadAllData();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to upload gallery item.');
      }
    });
  }

  // Delete Gallery Item
  deleteGalleryItem(id: string) {
    if (!confirm('Are you sure you want to delete this gallery item?')) return;

    this.apiService.deleteGalleryItem(id).subscribe({
      next: () => {
        this.successMessage.set('Gallery item deleted.');
        this.loadAllData();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: () => {
        this.errorMessage.set('Failed to delete gallery item.');
      }
    });
  }

  // Add Event
  addEvent() {
    if (!this.eventTitle || !this.eventDesc || !this.eventDate) {
      this.errorMessage.set('Please fill out all event fields.');
      return;
    }

    const formData = new FormData();
    formData.append('title', this.eventTitle);
    formData.append('description', this.eventDesc);
    formData.append('date', this.eventDate);
    if (this.eventFile) {
      formData.append('bannerFile', this.eventFile);
    }

    this.isLoading.set(true);
    this.apiService.addEvent(formData).subscribe({
      next: () => {
        this.successMessage.set('Event added successfully!');
        this.eventTitle = '';
        this.eventDesc = '';
        this.eventDate = '';
        this.eventFile = null;
        this.loadAllData();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to add event.');
      }
    });
  }

  // Delete Event
  deleteEvent(id: string) {
    if (!confirm('Are you sure you want to delete this event?')) return;

    this.apiService.deleteEvent(id).subscribe({
      next: () => {
        this.successMessage.set('Event deleted successfully.');
        this.loadAllData();
        setTimeout(() => this.successMessage.set(''), 3000);
      },
      error: () => {
        this.errorMessage.set('Failed to delete event.');
      }
    });
  }

  // Get filtered bookings
  getFilteredBookings() {
    const filter = this.bookingFilter();
    if (filter === 'All') return this.bookings();
    return this.bookings().filter(b => b.status === filter);
  }

  // Get filtered/searched donations
  getFilteredDonations() {
    const query = this.donationSearch().toLowerCase();
    if (!query) return this.donations();
    return this.donations().filter(d => 
      (d.donorName && d.donorName.toLowerCase().includes(query)) ||
      (d.purpose && d.purpose.toLowerCase().includes(query)) ||
      (d.transactionId && d.transactionId.toLowerCase().includes(query)) ||
      (d.phone && d.phone.includes(query))
    );
  }

  // Export Donations to CSV
  exportDonationsCSV() {
    const list = this.getFilteredDonations();
    if (list.length === 0) return;

    let csvContent = 'Date,Donor Name,Amount (INR),Payment Method,Purpose,Transaction ID,Status,Message\n';
    list.forEach(d => {
      const formattedDate = new Date(d.date).toLocaleDateString();
      const messageText = d.message ? d.message.replace(/"/g, '""') : '';
      csvContent += `"${formattedDate}","${d.donorName}",${d.amount},"${d.paymentMethod}","${d.purpose}","${d.transactionId}","${d.status}","${messageText}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Temple_Donations_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
