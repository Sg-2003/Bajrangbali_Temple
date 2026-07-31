import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./components/home/home').then(m => m.Home) },
  { path: 'about', loadComponent: () => import('./components/about/about').then(m => m.About) },
  { path: 'aarti', loadComponent: () => import('./components/aarti/aarti').then(m => m.Aarti) },
  { path: 'chalisa', loadComponent: () => import('./components/chalisa/chalisa').then(m => m.Chalisa) },
  { path: 'sundarkand', loadComponent: () => import('./components/sundarkand/sundarkand').then(m => m.Sundarkand) },
  { path: 'live-darshan', loadComponent: () => import('./components/live-darshan/live-darshan').then(m => m.LiveDarshan) },
  { path: 'events', loadComponent: () => import('./components/events/events').then(m => m.Events) },
  { path: 'services', loadComponent: () => import('./components/services/services').then(m => m.Services) },
  { path: 'devotees', loadComponent: () => import('./components/devotee-board/devotee-board').then(m => m.DevoteeBoard) },
  { path: 'donate', loadComponent: () => import('./components/donation/donation').then(m => m.Donation) },
  { path: 'gallery', loadComponent: () => import('./components/gallery/gallery').then(m => m.Gallery) },
  { path: 'contact', loadComponent: () => import('./components/contact/contact').then(m => m.Contact) },
  { path: 'login', loadComponent: () => import('./components/admin/login/login').then(m => m.AdminLogin) },
  { path: 'admin/login', redirectTo: 'login' },
  { path: 'register', loadComponent: () => import('./components/admin/register/register').then(m => m.Register) },
  { path: 'admin/dashboard', loadComponent: () => import('./components/admin/dashboard/dashboard').then(m => m.AdminDashboard), canActivate: [authGuard] },
  { path: 'user/dashboard', loadComponent: () => import('./components/user-dashboard/user-dashboard').then(m => m.UserDashboard), canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];

