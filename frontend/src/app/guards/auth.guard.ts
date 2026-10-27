import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If OAuth token is present in the route query params, process and authenticate immediately
  const token = route.queryParamMap.get('token');
  const userParam = route.queryParamMap.get('user');

  if (token && userParam) {
    try {
      const user = JSON.parse(decodeURIComponent(userParam));
      authService.handleOAuthSuccess(token, user);
      return true;
    } catch (e) {
      console.error('Failed to parse OAuth params in guard:', e);
    }
  }

  if (authService.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
