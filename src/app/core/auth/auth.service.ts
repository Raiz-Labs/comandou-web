import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginPayload, LoginResponse, Perfil } from '../../shared/types';
import { clearAuth, setAuth, userPerfil } from './auth.signal';

const PERFIL_ROUTES: Record<Perfil, string> = {
  garcom: '/garcom/mesas',
  cozinha: '/cozinha/fila',
  caixa: '/caixa/comandas',
  admin: '/admin/dashboard',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private get tenantHeaders(): HttpHeaders {
    return new HttpHeaders({ 'X-Tenant-Slug': environment.tenantSlug });
  }

  async login(payload: LoginPayload): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, payload, {
        withCredentials: true,
        headers: this.tenantHeaders,
      })
    );
    setAuth(response.accessToken, response.user);
    const destino = PERFIL_ROUTES[response.user.perfil] ?? '/login';
    await this.router.navigateByUrl(destino);
  }

  async refresh(): Promise<string> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(`${environment.apiUrl}/auth/refresh`, {}, {
        withCredentials: true,
        headers: this.tenantHeaders,
      })
    );
    setAuth(response.accessToken, response.user);
    return response.accessToken;
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/logout`, {}, {
          withCredentials: true,
          headers: this.tenantHeaders,
        })
      );
    } finally {
      clearAuth();
      await this.router.navigateByUrl('/login');
    }
  }

  getRedirectRoute(): string {
    const perfil = userPerfil();
    if (!perfil) return '/login';
    return PERFIL_ROUTES[perfil] ?? '/login';
  }
}
