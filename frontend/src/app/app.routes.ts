import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { About } from './components/about/about';
import { Services } from './components/services/services';
import { DevoteeBoard } from './components/devotee-board/devotee-board';
import { Donation } from './components/donation/donation';
import { Gallery } from './components/gallery/gallery';
import { Contact } from './components/contact/contact';
import { Aarti } from './components/aarti/aarti';
import { Chalisa } from './components/chalisa/chalisa';
import { Events } from './components/events/events';
import { AdminLogin } from './components/admin/login/login';
import { Register } from './components/admin/register/register';
import { AdminDashboard } from './components/admin/dashboard/dashboard';
import { Sundarkand } from './components/sundarkand/sundarkand';
import { LiveDarshan } from './components/live-darshan/live-darshan';
import { UserDashboard } from './components/user-dashboard/user-dashboard';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'about', component: About },
  { path: 'aarti', component: Aarti },
  { path: 'chalisa', component: Chalisa },
  { path: 'sundarkand', component: Sundarkand },
  { path: 'live-darshan', component: LiveDarshan },
  { path: 'events', component: Events },
  { path: 'services', component: Services },
  { path: 'devotees', component: DevoteeBoard },
  { path: 'donate', component: Donation },
  { path: 'gallery', component: Gallery },
  { path: 'contact', component: Contact },
  { path: 'login', component: AdminLogin },
  { path: 'admin/login', redirectTo: 'login' },
  { path: 'register', component: Register },
  { path: 'admin/dashboard', component: AdminDashboard, canActivate: [authGuard] },
  { path: 'user/dashboard', component: UserDashboard, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
