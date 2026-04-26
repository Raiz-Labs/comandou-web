import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-page">
      <div class="login-card b-card">
        <div class="login-card__header">
          <h1 class="login-card__title">Comandou</h1>
          <p class="login-card__subtitle b-text-muted">{{ tenantSlug }}</p>
        </div>

        <form class="login-form" (ngSubmit)="submit()">
          <div class="b-form-group">
            <label class="b-label" for="email">E-mail</label>
            <input
              id="email"
              type="email"
              class="b-input"
              [class.error]="errorMessage()"
              placeholder="seu@email.com"
              [(ngModel)]="email"
              name="email"
              required
              autocomplete="email"
            />
          </div>

          <div class="b-form-group">
            <label class="b-label" for="senha">Senha</label>
            <input
              id="senha"
              type="password"
              class="b-input"
              [class.error]="errorMessage()"
              placeholder="••••••••"
              [(ngModel)]="senha"
              name="senha"
              required
              autocomplete="current-password"
            />
          </div>

          @if (errorMessage()) {
            <p class="login-form__error">{{ errorMessage() }}</p>
          }

          <button
            type="submit"
            class="b-btn-primary b-w-full"
            [disabled]="loading()"
          >
            @if (loading()) {
              Entrando...
            } @else {
              Entrar
            }
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--b-space-4);
      background-color: var(--b-bg);
    }

    .login-card {
      width: 100%;
      max-width: 400px;
    }

    .login-card__header {
      text-align: center;
      margin-bottom: var(--b-space-6);
    }

    .login-card__title {
      font-size: var(--b-font-size-3xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-primary-500);
    }

    .login-card__subtitle {
      font-size: var(--b-font-size-sm);
      text-transform: capitalize;
      margin-top: var(--b-space-1);
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: var(--b-space-4);
    }

    .b-form-group {
      display: flex;
      flex-direction: column;
    }

    .login-form__error {
      font-size: var(--b-font-size-sm);
      color: var(--b-danger-600);
      padding: var(--b-space-2) var(--b-space-3);
      background-color: var(--b-danger-50);
      border-radius: var(--b-radius-sm);
      border: 1px solid var(--b-danger-100);
    }
  `],
})
export class LoginComponent {
  private readonly authService = inject(AuthService);

  protected email = '';
  protected senha = '';
  protected loading = signal(false);
  protected errorMessage = signal('');
  protected tenantSlug = environment.tenantSlug;

  async submit(): Promise<void> {
    if (!this.email || !this.senha) return;
    this.loading.set(true);
    this.errorMessage.set('');
    try {
      await this.authService.login({ email: this.email, senha: this.senha });
    } catch {
      this.errorMessage.set('E-mail ou senha inválidos.');
    } finally {
      this.loading.set(false);
    }
  }
}
