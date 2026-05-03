import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoginResponse } from '../../shared/types';
import { clearAuth, setAuth } from '../auth/auth.signal';
import {
  clearImpersonating,
  clearMasterAuth,
  MasterUser,
  setImpersonating,
  setMasterAuth,
} from './master-auth.signal';

interface MasterLoginResponse {
  token: string;
  master: MasterUser;
}

@Injectable({ providedIn: 'root' })
export class MasterAuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  async login(email: string, senha: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<MasterLoginResponse>(
        `${environment.apiUrl}/master/auth/login`,
        { email, senha },
      )
    );
    setMasterAuth(response.token, response.master);
    await this.router.navigateByUrl('/master/tenants');
  }

  async logout(): Promise<void> {
    clearAuth();
    clearMasterAuth();
    await this.router.navigateByUrl('/master/login');
  }

  async impersonateTenant(tenantId: string, tenantNome: string): Promise<void> {
    const response = await firstValueFrom(
      this.http.post<LoginResponse>(
        `${environment.apiUrl}/master/tenants/${tenantId}/impersonate`,
        {},
      )
    );
    setAuth(response.accessToken, response.user);
    setImpersonating({ tenantId, tenantNome });
    await this.router.navigateByUrl('/admin/dashboard');
  }

  exitImpersonation(): void {
    clearAuth();
    clearImpersonating();
    this.router.navigateByUrl('/master/tenants');
  }
}
