import { HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { authState, clearAuth, setAuth } from './auth.signal';
import { clearMasterAuth, masterAuthState } from '../master/master-auth.signal';

// Compartilhado entre requisições concorrentes: garante uma única chamada de
// refresh em voo mesmo se várias requisições receberem 401 ao mesmo tempo.
let refreshInFlight: Promise<string> | null = null;

const getRefreshedToken = (authService: AuthService): Promise<string> => {
  if (!refreshInFlight) {
    refreshInFlight = authService.refresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  // inject() só é válido no corpo síncrono do interceptor — nunca dentro de
  // callbacks assíncronos como catchError, senão dispara NG0203 em runtime.
  const router = inject(Router);

  // Rotas master usam o token do admin master — sem X-Tenant-Slug
  if (req.url.includes('/master/')) {
    const masterToken = masterAuthState().token;
    const masterReq = masterToken
      ? req.clone({ setHeaders: { Authorization: `Bearer ${masterToken}` } })
      : req;
    return next(masterReq).pipe(
      catchError((err) => {
        if (err.status === 401) {
          // Master expirou em meio a uma impersonação: a sessão do tenant
          // impersonado não faz sentido sem o master que a originou.
          if (masterAuthState().impersonating) {
            clearAuth();
          }
          clearMasterAuth();
          router.navigateByUrl('/master/login');
        }
        return throwError(() => err);
      })
    );
  }

  // Rotas regulares — token de usuário + slug de tenant
  const token = authState().token;
  const authService = inject(AuthService);

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
        return from(getRefreshedToken(authService)).pipe(
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
            // Token de tenant expirou em meio a uma impersonação: não deixa
            // o master com "impersonating" órfão apontando pra uma sessão morta.
            if (masterAuthState().impersonating) {
              clearMasterAuth();
            }
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
