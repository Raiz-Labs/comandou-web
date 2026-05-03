import { Component, inject, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { MasterAuthService } from '../../../core/master/master-auth.service';

@Component({
  selector: 'app-master-login',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="page">
      <div class="card">
        <div class="card__header">
          <div class="card__icon">
            <lucide-icon name="zap" [size]="24" color="var(--b-primary-500)" />
          </div>
          <h1 class="card__title">Acesso master</h1>
          <p class="card__sub">Restrito ao administrador da plataforma</p>
        </div>

        <form class="form" (submit)="onSubmit($event)" novalidate>
          <div class="field">
            <label class="label" for="email">E-mail</label>
            <input
              id="email"
              type="email"
              class="input"
              placeholder="admin@comandou.com.br"
              autocomplete="email"
              [value]="email()"
              (input)="email.set($any($event.target).value)"
            />
          </div>

          <div class="field">
            <label class="label" for="senha">Senha</label>
            <div class="input-wrap">
              <input
                id="senha"
                [type]="senhaVisivel() ? 'text' : 'password'"
                class="input input--senha"
                placeholder="••••••"
                autocomplete="current-password"
                [value]="senha()"
                (input)="senha.set($any($event.target).value)"
              />
              <button
                type="button"
                class="toggle-senha"
                (click)="senhaVisivel.set(!senhaVisivel())"
                [attr.aria-label]="senhaVisivel() ? 'Ocultar senha' : 'Mostrar senha'"
              >
                <lucide-icon [name]="senhaVisivel() ? 'eye-off' : 'eye'" [size]="16" />
              </button>
            </div>
          </div>

          @if (erro()) {
            <p class="erro">{{ erro() }}</p>
          }

          <button type="submit" class="btn-submit" [disabled]="loading()">
            @if (loading()) {
              <lucide-icon name="loader-2" [size]="16" class="spin" />
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
    .page {
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--b-bg);
      padding: var(--b-space-4);
      font-family: var(--b-font-sans);
    }

    .card {
      width: 100%;
      max-width: 400px;
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-lg);
      border: 1px solid var(--b-neutral-100);
      box-shadow: var(--b-shadow-2);
      padding: var(--b-space-8) var(--b-space-6);
    }

    .card__header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: var(--b-space-6);
    }

    .card__icon {
      width: 52px;
      height: 52px;
      border-radius: var(--b-radius-md);
      background-color: var(--b-primary-50);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--b-space-3);
    }

    .card__title {
      font-size: var(--b-font-size-2xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
      margin: 0;
    }

    .card__sub {
      font-size: var(--b-font-size-sm);
      color: var(--b-fg-muted);
      margin: var(--b-space-1) 0 0;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: var(--b-space-4);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--b-space-1);
    }

    .label {
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg);
    }

    .input {
      width: 100%;
      height: 44px;
      padding: 0 var(--b-space-3);
      border: 1.5px solid var(--b-neutral-200);
      border-radius: var(--b-radius-sm);
      background-color: var(--b-bg);
      color: var(--b-fg);
      font-size: var(--b-font-size-sm);
      font-family: var(--b-font-sans);
      transition: border-color 0.15s;
      box-sizing: border-box;

      &:focus { outline: none; border-color: var(--b-primary-400); }
      &::placeholder { color: var(--b-fg-subtle); }

      &--senha { padding-right: 44px; }
    }

    .input-wrap {
      position: relative;
    }

    .toggle-senha {
      position: absolute;
      right: 0;
      top: 0;
      height: 44px;
      width: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      background: transparent;
      color: var(--b-fg-muted);
      cursor: pointer;
      border-radius: 0 var(--b-radius-sm) var(--b-radius-sm) 0;

      &:hover { color: var(--b-fg); }
    }

    .erro {
      font-size: var(--b-font-size-sm);
      color: var(--b-danger-600);
      background-color: var(--b-danger-50);
      border: 1px solid var(--b-danger-200);
      border-radius: var(--b-radius-sm);
      padding: var(--b-space-2) var(--b-space-3);
      margin: 0;
    }

    .btn-submit {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--b-space-2);
      width: 100%;
      height: 48px;
      border: none;
      border-radius: var(--b-radius-sm);
      background-color: var(--b-primary-500);
      color: white;
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-bold);
      font-family: var(--b-font-sans);
      cursor: pointer;
      transition: background-color 0.1s;

      &:hover:not(:disabled) { background-color: var(--b-primary-600); }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class MasterLoginComponent {
  private readonly masterAuthService = inject(MasterAuthService);

  protected readonly email = signal('');
  protected readonly senha = signal('');
  protected readonly senhaVisivel = signal(false);
  protected readonly loading = signal(false);
  protected readonly erro = signal('');

  protected async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.email() || !this.senha()) {
      this.erro.set('Preencha todos os campos');
      return;
    }
    this.erro.set('');
    this.loading.set(true);
    try {
      await this.masterAuthService.login(this.email(), this.senha());
    } catch {
      this.erro.set('Credenciais inválidas');
    } finally {
      this.loading.set(false);
    }
  }
}
