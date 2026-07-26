import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-gallery',
  standalone: true,
  templateUrl: './gallery.html',
  styleUrl: './gallery.css'
})
export class Gallery implements OnInit {
  private apiService = inject(ApiService);

  images = signal<any[]>([]);

  fallbackImages = [
    { 
      id: 1, 
      url: '/gallery_hanuman.png', 
      title: 'Lord Hanuman Holy Idol', 
      category: 'Rituals', 
      desc: 'The magnificent standing Bajrangbali idol adorned in golden shringar and fresh marigold flowers.' 
    },
    { 
      id: 2, 
      url: '/gallery_maha.png', 
      title: 'Evening Maha Aarti', 
      category: 'Rituals', 
      desc: 'Devotees gather in divine bliss for the daily Sandhya Aarti with multi-tier brass lamps.' 
    },
    { 
      id: 3, 
      url: '/gallery_temple.png', 
      title: 'Temple Exterior Gopuram', 
      category: 'Campus', 
      desc: 'The majestic architecture of Hanuman Mandir with fluttering saffron flags at sunset.' 
    },
    { 
      id: 4, 
      url: '/gallery_jayanti.png', 
      title: 'Hanuman Jayanti Festival', 
      category: 'Events', 
      desc: 'Grand festive procession, saffron flags, and flower garlands during Hanuman Jayanti.' 
    },
    { 
      id: 5, 
      url: '/gallery_sundarkand.png', 
      title: 'Sundarkand Path Gathering', 
      category: 'Events', 
      desc: 'Weekly congregational Sundarkand Path recitation every Saturday evening.' 
    },
    { 
      id: 6, 
      url: '/gallery_banyan.png', 
      title: 'Sacred Banyan Tree Shrine', 
      category: 'Campus', 
      desc: 'The historic holy Banyan tree shrine wrapped with sacred threads and brass bells.' 
    },
    { 
      id: 7, 
      url: '/gallery_bhandara.png', 
      title: 'Mahaprasad Bhandara Offering', 
      category: 'Events', 
      desc: 'Community Prasad distribution and holy food offering for all visiting devotees.' 
    },
    { 
      id: 8, 
      url: '/gallery_night.png', 
      title: 'Night Temple Illumination', 
      category: 'Campus', 
      desc: 'Temple campus illuminated with thousands of golden oil lamps under the starry sky.' 
    }
  ];

  categories = ['All', 'Rituals', 'Events', 'Campus'];
  selectedCategory = signal('All');

  // Filtered images list
  filteredImages = computed(() => {
    const cat = this.selectedCategory();
    if (cat === 'All') {
      return this.images();
    }
    return this.images().filter(img => img.category === cat);
  });

  // Lightbox State
  isLightboxOpen = signal(false);
  activeImage = signal<any>(null);

  ngOnInit() {
    this.fetchGallery();
  }

  fetchGallery() {
    this.apiService.getGallery().subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          const normalized = data.map((item, index) => ({
            id: item._id || index + 1,
            url: item.image || this.fallbackImages[index % this.fallbackImages.length].url,
            title: item.title,
            category: item.category || 'Rituals',
            desc: item.desc || item.title
          }));
          this.images.set(normalized);
        } else {
          this.images.set(this.fallbackImages);
        }
      },
      error: () => {
        this.images.set(this.fallbackImages);
      }
    });
  }

  setCategory(cat: string) {
    this.selectedCategory.set(cat);
  }

  openLightbox(image: any) {
    this.activeImage.set(image);
    this.isLightboxOpen.set(true);
  }

  closeLightbox() {
    this.isLightboxOpen.set(false);
    this.activeImage.set(null);
  }

  nextImage() {
    const currentList = this.filteredImages();
    const currentActive = this.activeImage();
    if (!currentActive) return;

    const currentIndex = currentList.findIndex(img => img.id === currentActive.id);
    const nextIndex = (currentIndex + 1) % currentList.length;
    this.activeImage.set(currentList[nextIndex]);
  }

  prevImage() {
    const currentList = this.filteredImages();
    const currentActive = this.activeImage();
    if (!currentActive) return;

    const currentIndex = currentList.findIndex(img => img.id === currentActive.id);
    const prevIndex = (currentIndex - 1 + currentList.length) % currentList.length;
    this.activeImage.set(currentList[prevIndex]);
  }
}
