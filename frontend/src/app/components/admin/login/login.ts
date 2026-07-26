import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class AdminLogin {
  private authService = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';
  
  isSubmitting = signal(false);
  errorMessage = signal('');

  login() {
    if (!this.email || !this.password) {
      this.errorMessage.set('Please fill in both email and password.');
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        if (res.user && res.user.role === 'admin') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/user/dashboard']);
        }
      },
      error: (err) => {
        console.error('Login failed:', err);
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.error || 'Invalid email or password. Please try again.');
      }
    });
  }
}
