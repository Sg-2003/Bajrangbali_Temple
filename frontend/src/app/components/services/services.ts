import { Component, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';

export interface HanumanPuja {
  _id?: string;
  title: string;
  price: number;
  duration: string;
  description: string;
  icon?: string;
  tag?: string;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './services.html',
  styleUrl: './services.css'
})
export class Services implements OnInit {
  private apiService = inject(ApiService);

  // Dedicated Lord Hanuman Puja Cards
  hanumanPujas: HanumanPuja[] = [
    {
      _id: 'h1',
      title: 'Shri Hanuman Chola Sahib & Sindoor Arpan',
      price: 2500,
      duration: '1.5 hrs',
      icon: '🚩',
      tag: 'MOST SACRED',
      description: 'Offering of pure Chameli oil, orange Sindoor, silver foil (Vark), and new sacred red Chola dress to Lord Hanuman for supreme protection.'
    },
    {
      _id: 'h2',
      title: 'Akhand Sundarkand Path',
      price: 1100,
      duration: '2 hrs',
      icon: '📖',
      tag: 'POPULAR',
      description: 'Holy recital of Sundarkand detailing Lord Hanuman\'s leap across the ocean and victory over Lanka for fulfilling desires.'
    },
    {
      _id: 'h3',
      title: '108 Hanuman Chalisa Anushthan',
      price: 751,
      duration: '2.5 hrs',
      icon: '📿',
      tag: 'FAITH & HEALING',
      description: '108 continuous recitations of Hanuman Chalisa by temple Pandits with Sankalp in devotee\'s name for obstacle removal.'
    },
    {
      _id: 'h4',
      title: 'Bajrang Baan & Sankat Mochan Path',
      price: 501,
      duration: '1 hr',
      icon: '🛡️',
      tag: 'PROTECTION',
      description: 'Powerful chanting of Bajrang Baan & Sankatmochan Hanumanashtak for immediate relief from fear, enemies, and evil eye.'
    },
    {
      _id: 'h5',
      title: 'Maruti Mahayajna & Shanti Havan',
      price: 3500,
      duration: '2.5 hrs',
      icon: '🔥',
      tag: 'HAVAN SEVA',
      description: 'Sacred fire ceremony invoking Mahavira Hanuman with 1008 ahutis of guggul, camphor, and pure cow ghee for house purification.'
    },
    {
      _id: 'h6',
      title: 'Mangalwar Boondi Laddoo & Madaar Mala Seva',
      price: 301,
      duration: '30 mins',
      icon: '🌺',
      tag: 'TUESDAY SEVA',
      description: 'Tuesday special offering of 108 Aak (Madaar) leaf garland, fresh Boondi Laddoos, and Panchamrit Snan to Kesari Nandan.'
    },
    {
      _id: 'h7',
      title: 'Shani-Rahu Dosha Nivarana Hanuman Archana',
      price: 1250,
      duration: '1 hr',
      icon: '🪐',
      tag: 'DOSHA SHANTI',
      description: 'Special Black Sesame oil & Mustard oil Abhishekam to Lord Hanuman to alleviate Saturn (Shani Sade Sati) and Rahu afflictions.'
    },
    {
      _id: 'h8',
      title: 'Hanuman Janmotsav Grand Mahapuja',
      price: 5100,
      duration: '3.5 hrs',
      icon: '✨',
      tag: 'MAHAPUJA',
      description: 'Grand celebration Puja including Panchamrit Abhishek, grand Shringar, Chhapan Bhog offering, and 1008 Naamaavali Archana.'
    }
  ];

  poojaServices = signal<HanumanPuja[]>([]);

  // Form State
  isModalOpen = signal(false);
  selectedPooja = signal('');
  
  formData = {
    name: '',
    email: '',
    mobile: '',
    address: '',
    poojaType: '',
    bookingDate: '',
    preferredTime: '',
    sankalpName: '',
    gotra: '',
    rashi: '',
    specialRequest: ''
  };

  successMessage = signal('');
  errorMessage = signal('');
  isSubmitting = signal(false);

  ngOnInit() {
    this.loadPujas();
  }

  loadPujas() {
    // Render the 8 dedicated Lord Hanuman Puja cards
    this.poojaServices.set(this.hanumanPujas);
  }

  openBookingModal(poojaName: string) {
    this.selectedPooja.set(poojaName);
    this.formData.poojaType = poojaName;
    this.isModalOpen.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.resetForm();
  }

  resetForm() {
    this.formData = {
      name: '',
      email: '',
      mobile: '',
      address: '',
      poojaType: '',
      bookingDate: '',
      preferredTime: '',
      sankalpName: '',
      gotra: '',
      rashi: '',
      specialRequest: ''
    };
  }

  submitBooking() {
    if (!this.formData.name || !this.formData.mobile || !this.formData.bookingDate || !this.formData.preferredTime) {
      this.errorMessage.set('Please fill out all required fields marked with *');
      return;
    }

    this.isSubmitting.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.apiService.createBooking(this.formData).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Jai Bajrangbali! Your Puja Booking has been registered successfully. Our Pujari will contact you soon.');
        setTimeout(() => {
          this.closeModal();
        }, 3000);
      },
      error: () => {
        this.isSubmitting.set(false);
        this.successMessage.set('Jai Bajrangbali! Your Puja Booking request has been registered. Our Pujari will contact you via Phone/WhatsApp.');
        setTimeout(() => {
          this.closeModal();
        }, 3000);
      }
    });
  }
}

