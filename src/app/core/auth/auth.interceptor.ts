import { HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { authState, clearAuth, setAuth } from './auth.signal';
import { masterAuthState } from '../master/master-auth.signal';

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  // Rotas master usam o token do admin master — sem X-Tenant-Slug
  if (req.url.includes('/master/')) {
    const masterToken = masterAuthState().token;
    const masterReq = masterToken
      ? req.clone({ setHeaders: { Authorization: `Bearer ${masterToken}` } })
      : req;
    return next(masterReq).pipe(
      catchError((err) => {
        if (err.status === 401) {
          inject(Router).navigateByUrl('/master/login');
        }
        return throwError(() => err);
      })
    );
  }

  // Rotas regulares — token de usuário + slug de tenant
  const token = authState().token;
  const authService = inject(AuthService);
  const router = inject(Router);

  const headers: Record<string, string> = {
    'X-Tenant-Slug': environment.tenantSlug,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const authReq = req.clone({ setHeaders: headers, withCredentials: true });

  return next(authReq).pipe(
    catchError((err) => {
      if (err.status === 401 && !req.url.includes('/auth/refresh')) {
        return from(authService.refresh()).pipe(
          switchMap((newToken) => {
            const user = authState().user;
            setAuth(newToken, user);
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`,
                'X-Tenant-Slug': environment.tenantSlug,
              },
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
