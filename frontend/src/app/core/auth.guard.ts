import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from './services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.validateSession().pipe(map(ok => ok ? true : router.createUrlTree(['/'])));
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.validateSession().pipe(map(ok => ok && auth.isAdmin() ? true : router.createUrlTree(['/chat'])));
};
