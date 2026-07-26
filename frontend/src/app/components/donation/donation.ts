import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-donation',
  standalone: true,
  imports: [FormsModule, DatePipe],
  templateUrl: './donation.html',
  styleUrl: './donation.css'
})
export class Donation {
  private apiService = inject(ApiService);

  presets = [501, 1100, 2100, 5001];
  
  // Form State
  donorName = '';
  amount: number | null = null;
  email = '';
  phone = '';
  purpose = 'General Donation';
  message = '';
  paymentMethod = 'UPI';

  isSimulatingPayment = signal(false);
  showReceipt = signal(false);
  receiptData = signal<any>(null);
  errorMessage = signal('');

  selectPreset(value: number) {
    this.amount = value;
  }

  submitDonation() {
    if (!this.amount || this.amount <= 0) {
      this.errorMessage.set('Please specify a valid donation amount.');
      return;
    }

    this.isSimulatingPayment.set(true);
    this.errorMessage.set('');

    const donationDetails = {
      donorName: this.donorName || 'Anonymous',
      amount: this.amount,
      email: this.email,
      phone: this.phone,
      purpose: this.purpose,
      message: this.message
    };

    // Load Razorpay script dynamically
    this.loadRazorpayScript().then(() => {
      // Initiate order
      this.apiService.createDonationOrder(donationDetails).subscribe({
        next: (res) => {
          if (res.gateway === 'razorpay') {
            this.triggerRazorpayCheckout(res, donationDetails);
          } else {
            // Simulated payment gateway flow
            setTimeout(() => {
              this.verifyAndRecordSimulated(res.orderId, donationDetails);
            }, 1500);
          }
        },
        error: (err) => {
          console.error('Error starting payment order:', err);
          this.isSimulatingPayment.set(false);
          this.errorMessage.set(err.error?.error || 'Failed to initialize transaction. Please try again.');
        }
      });
    }).catch(err => {
      console.error(err);
      this.isSimulatingPayment.set(false);
      this.errorMessage.set('Failed to initialize payment gateway scripts.');
    });
  }

  private loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).Razorpay) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Razorpay SDK failed to load.'));
      document.body.appendChild(script);
    });
  }

  private triggerRazorpayCheckout(orderInfo: any, details: any) {
    const options = {
      key: 'rzp_test_dummy_key', // Handled securely on backend, script requires a key pattern
      amount: orderInfo.amount,
      currency: orderInfo.currency,
      name: 'Bajrangbali Hanuman Mandir',
      description: details.purpose,
      order_id: orderInfo.orderId,
      handler: (response: any) => {
        const verificationData = {
          gateway: 'razorpay',
          orderId: response.razorpay_order_id,
          paymentId: response.razorpay_payment_id,
          signature: response.razorpay_signature,
          donorName: details.donorName,
          amount: details.amount,
          email: details.email,
          phone: details.phone,
          purpose: details.purpose,
          message: details.message
        };

        this.apiService.verifyDonationPayment(verificationData).subscribe({
          next: (verifyRes) => {
            this.isSimulatingPayment.set(false);
            this.receiptData.set(verifyRes.donation);
            this.showReceipt.set(true);
            this.resetForm();
          },
          error: (err) => {
            console.error('Payment verification failed:', err);
            this.isSimulatingPayment.set(false);
            this.errorMessage.set('Transaction verification failed. Please contact trust admins.');
          }
        });
      },
      prefill: {
        name: details.donorName,
        email: details.email,
        contact: details.phone
      },
      theme: {
        color: '#E65100'
      },
      modal: {
        ondismiss: () => {
          this.isSimulatingPayment.set(false);
          this.errorMessage.set('Payment process was cancelled by user.');
        }
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  }

  private verifyAndRecordSimulated(orderId: string, details: any) {
    const verificationData = {
      gateway: 'simulated',
      orderId: orderId,
      paymentId: 'PAY-SIM-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      donorName: details.donorName,
      amount: details.amount,
      email: details.email,
      phone: details.phone,
      purpose: details.purpose,
      message: details.message
    };

    this.apiService.verifyDonationPayment(verificationData).subscribe({
      next: (verifyRes) => {
        this.isSimulatingPayment.set(false);
        this.receiptData.set(verifyRes.donation);
        this.showReceipt.set(true);
        this.resetForm();
      },
      error: (err) => {
        console.error('Simulated transaction logging failed:', err);
        this.isSimulatingPayment.set(false);
        this.errorMessage.set('Failed to register contribution record.');
      }
    });
  }

  resetForm() {
    this.donorName = '';
    this.amount = null;
    this.email = '';
    this.phone = '';
    this.purpose = 'General Donation';
    this.message = '';
    this.paymentMethod = 'UPI';
  }

  closeReceipt() {
    this.showReceipt.set(false);
    this.receiptData.set(null);
  }
}
