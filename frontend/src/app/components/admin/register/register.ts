import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private authService = inject(AuthService);
  private router = inject(Router);

  name = '';
  email = '';
  mobile = '';
  password = '';
  confirmPassword = '';
  errorMsg = signal('');
  loading = signal(false);

  onSubmit() {
    this.errorMsg.set('');

    if (!this.name.trim() || !this.email.trim() || !this.password) {
      this.errorMsg.set('Please fill out all required fields.');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMsg.set('Passwords do not match.');
      return;
    }

    this.loading.set(true);
    const signupData = {
      name: this.name,
      email: this.email,
      mobile: this.mobile,
      password: this.password,
      role: 'devotee'
    };

    this.authService.register(signupData).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.router.navigate(['/user/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        console.error(err);
        this.errorMsg.set(err.error?.error || 'Registration failed. Please try again.');
      }
    });
  }
}
