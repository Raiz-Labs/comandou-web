import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { MasterAuthService } from '../../../core/master/master-auth.service';
import { masterAuthState } from '../../../core/master/master-auth.signal';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-master-shell',
  standalone: true,
  imports: [RouterOutlet, LucideAngularModule, ThemeToggleComponent],
  template: `
    <div class="master-layout">
      <header class="master-header">
        <div class="master-header__brand">
          <lucide-icon name="zap" [size]="18" color="var(--b-primary-500)" />
          <span>Comandou <strong>Master</strong></span>
        </div>
        <div class="master-header__right">
          <span class="master-header__email">{{ master()?.email }}</span>
          <app-theme-toggle />
          <button class="master-header__logout" (click)="logout()" aria-label="Sair">
            <lucide-icon name="log-out" [size]="15" />
            Sair
          </button>
        </div>
      </header>
      <main class="master-content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100dvh; overflow: hidden; }

    .master-layout {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      background-color: var(--b-bg);
      font-family: var(--b-font-sans);
    }

    .master-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 56px;
      padding: 0 var(--b-space-6);
      background-color: var(--b-bg-elevated);
      border-bottom: 1px solid var(--b-neutral-100);
      flex-shrink: 0;
      gap: var(--b-space-4);
    }

    .master-header__brand {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
      font-size: var(--b-font-size-md);
      color: var(--b-fg);

      strong { color: var(--b-primary-500); }
    }

    .master-header__right {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
    }

    .master-header__email {
      font-size: var(--b-font-size-sm);
      color: var(--b-fg-muted);

      @media (max-width: 767px) { display: none; }
    }

    .master-header__logout {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
      padding: var(--b-space-2) var(--b-space-3);
      border: 1px solid var(--b-neutral-200);
      border-radius: var(--b-radius-sm);
      background: transparent;
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-medium);
      color: var(--b-fg-muted);
      cursor: pointer;
      font-family: var(--b-font-sans);
      min-height: 36px;
      transition: background-color 0.1s, color 0.1s, border-color 0.1s;

      &:hover {
        background-color: var(--b-danger-50);
        color: var(--b-danger-600);
        border-color: var(--b-danger-200);
      }
    }

    .master-content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    }
  `],
})
export class MasterShellComponent {
  private readonly masterAuthService = inject(MasterAuthService);

  protected readonly master = () => masterAuthState().master;

  protected async logout(): Promise<void> {
    await this.masterAuthService.logout();
  }
}
