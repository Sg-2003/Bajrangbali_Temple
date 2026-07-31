import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private apiUrl = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
    ? 'http://localhost:5000/api'
    : 'https://bajrangbali-temple-backend.onrender.com/api'; // Will be replaced by Cloud Run URL after deployment

  // ==========================================
  // POOJA BOOKINGS
  // ==========================================
  getBookings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/bookings`);
  }

  createBooking(booking: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/bookings`, booking);
  }

  updateBookingStatus(id: string, status: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/bookings/${id}`, { status });
  }

  updateBookingPaymentStatus(id: string, paymentStatus: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/bookings/${id}/payment`, { paymentStatus });
  }

  // ==========================================
  // DYNAMIC PUJAS OFFERINGS
  // ==========================================
  getPujas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pujas`);
  }

  createPuja(puja: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/pujas`, puja);
  }

  updatePuja(id: string, puja: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/pujas/${id}`, puja);
  }

  deletePuja(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/pujas/${id}`);
  }

  // ==========================================
  // DYNAMIC ANNOUNCEMENTS
  // ==========================================
  getAnnouncements(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/announcements`);
  }

  createAnnouncement(announcement: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/announcements`, announcement);
  }

  deleteAnnouncement(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/announcements/${id}`);
  }

  // ==========================================
  // DEVOTEE DASHBOARD SERVICE ENDPOINTS
  // ==========================================
  getDevoteeBookings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/devotee/bookings`);
  }

  getDevoteeDonations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/devotee/donations`);
  }

  updateDevoteeProfile(profile: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/devotee/profile`, profile);
  }

  // ==========================================
  // ADMIN USER MANAGEMENT
  // ==========================================
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`);
  }

  toggleUserSuspension(id: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/users/${id}/suspend`, {});
  }

  deleteUser(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/users/${id}`);
  }

  // ==========================================
  // DONATIONS (Razorpay + Direct Logging)
  // ==========================================
  getDonations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/donations`);
  }

  createDonation(donation: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/donations`, donation);
  }

  createDonationOrder(donationOrder: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/donations/order`, donationOrder);
  }

  verifyDonationPayment(verificationData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/donations/verify`, verificationData);
  }

  // ==========================================
  // GALLERY MANAGEMENT
  // ==========================================
  getGallery(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/gallery`);
  }

  addGalleryItem(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/gallery`, formData);
  }

  deleteGalleryItem(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/gallery/${id}`);
  }

  // ==========================================
  // EVENTS MANAGEMENT
  // ==========================================
  getEvents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/events`);
  }

  addEvent(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/events`, formData);
  }

  deleteEvent(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/events/${id}`);
  }

  // ==========================================
  // PRAYERS WALL / DEVOTEE BOARD
  // ==========================================
  getPrayers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/prayers`);
  }

  createPrayer(prayer: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/prayers`, prayer);
  }

  deletePrayer(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/prayers/${id}`);
  }

  // ==========================================
  // CONTACT INQUIRIES
  // ==========================================
  submitContact(contact: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/contact`, contact);
  }

  getContacts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/contact`);
  }

  // ==========================================
  // ADMIN DASHBOARD STATISTICS
  // ==========================================
  getAdminStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/stats`);
  }

  // ==========================================
  // AI CHATBOT
  // ==========================================
  sendMessageToChat(message: string, session: string, lang: string = 'en'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/chat`, { message, session, lang });
  }
}
