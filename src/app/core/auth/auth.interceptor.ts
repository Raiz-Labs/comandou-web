import { HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { authState, clearAuth, setAuth } from './auth.signal';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const token = authState().token;
  const authService = inject(AuthService);
  const router = inject(Router);

  const authReq = token
    ? req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      })
    : req.clone({ withCredentials: true });

  return next(authReq).pipe(
    catchError((err) => {
      if (err.status === 401 && !req.url.includes('/auth/refresh')) {
        return from(authService.refresh()).pipe(
          switchMap((newToken) => {
            const user = authState().user;
            setAuth(newToken, user);
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` },
              withCredentials: true,
            });
            return next(retryReq);
          }),
          catchError((refreshErr) => {
            clearAuth();
            router.navigateByUrl('/login');
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => err);
    })
  );
};
