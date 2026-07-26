import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  const path = route.routeConfig?.path;
  const user = authService.currentUser();

  // If trying to access admin routes, verify admin role
  if (path && path.startsWith('admin') && (!user || user.role !== 'admin')) {
    router.navigate(['/user/dashboard']);
    return false;
  }

  return true;
};
