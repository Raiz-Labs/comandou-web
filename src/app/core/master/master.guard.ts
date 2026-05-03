import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isMasterAuthenticated } from './master-auth.signal';

export const masterGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (!isMasterAuthenticated()) {
    return router.createUrlTree(['/master/login']);
  }
  return true;
};

export const masterPublicGuard: CanActivateFn = () => {
  const router = inject(Router);
  if (isMasterAuthenticated()) {
    return router.createUrlTree(['/master/tenants']);
  }
  return true;
};
