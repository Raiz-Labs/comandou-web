import { Component, inject, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/auth/auth.service';
import { currentUser, userPerfil } from '../../../core/auth/auth.signal';
import { MasterAuthService } from '../../../core/master/master-auth.service';
import { masterImpersonating } from '../../../core/master/master-auth.signal';
import { Perfil } from '../../types';

interface NavLink {
  label: string;
  icon: string;
  rota: string;
}

const NAV_CONFIG: Record<Perfil, NavLink[]> = {
  garcom: [
    { label: 'Mesas',     icon: 'layout-grid', rota: '/garcom/mesas' },
  ],
  cozinha: [
    { label: 'Fila',      icon: 'chef-hat',    rota: '/cozinha/fila' },
  ],
  caixa: [
    { label: 'Comandas',  icon: 'receipt',     rota: '/caixa/comandas' },
  ],
  admin: [
    { label: 'Dashboard', icon: 'layout-dashboard', rota: '/admin/dashboard'  },
    { label: 'Produtos',  icon: 'package',          rota: '/admin/produtos'   },
    { label: 'Categorias',icon: 'tag',               rota: '/admin/categorias' },
    { label: 'Mesas',     icon: 'layout-grid',       rota: '/admin/mesas'      },
    { label: 'Usuários',  icon: 'users',             rota: '/admin/usuarios'   },
    { label: 'Relatórios',icon: 'bar-chart-2',       rota: '/admin/relatorios' },
  ],
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LucideAngularModule],
  template: `
    <div class="shell">

      <!-- Overlay mobile -->
      <div
        class="overlay"
        [class.overlay--visible]="drawerOpen()"
        (click)="drawerOpen.set(false)"
        aria-hidden="true"
      ></div>

      <!-- Sidebar / Drawer -->
      <nav class="sidebar" [class.sidebar--open]="drawerOpen()" aria-label="Navegação principal">

        <div class="sidebar__brand">
          <lucide-icon name="utensils" [size]="22" color="var(--b-primary-500)" />
          <span>Comandou</span>
        </div>

        <button
          class="sidebar__close"
          (click)="drawerOpen.set(false)"
          aria-label="Fechar menu"
        >
          <lucide-icon name="x" [size]="20" />
        </button>

        <ul class="sidebar__nav" role="list">
          @for (link of navLinks(); track link.rota) {
            <li>
              <a
                [routerLink]="link.rota"
                routerLinkActive="sidebar__link--active"
                class="sidebar__link"
                (click)="drawerOpen.set(false)"
              >
                <lucide-icon [name]="link.icon" [size]="18" />
                {{ link.label }}
              </a>
            </li>
          }
        </ul>

        <div class="sidebar__footer">
          @if (currentUser()) {
            <div class="sidebar__user">
              <div class="sidebar__avatar">
                {{ currentUser()!.nome.charAt(0).toUpperCase() }}
              </div>
              <div class="sidebar__user-info">
                <span class="sidebar__user-nome">{{ currentUser()!.nome }}</span>
                <span class="sidebar__user-perfil">{{ currentUser()!.perfil }}</span>
              </div>
            </div>
          }
          <button class="sidebar__logout" (click)="logout()" aria-label="Sair">
            <lucide-icon name="log-out" [size]="16" />
            Sair
          </button>
        </div>
      </nav>

      <!-- Área principal -->
      <div class="main">

        <!-- Banner de impersonação (admin master acessando tenant) -->
        @if (impersonating()) {
          <div class="impersonation-banner">
            <lucide-icon name="zap" [size]="13" />
            Você está acessando o tenant <strong>{{ impersonating()!.tenantNome }}</strong> como admin
            <button class="impersonation-banner__exit" (click)="exitImpersonation()">
              <lucide-icon name="log-out" [size]="13" />
              Sair do tenant
            </button>
          </div>
        }

        <!-- Topbar mobile -->
        <header class="topbar">
          <button
            class="topbar__menu"
            (click)="drawerOpen.set(true)"
            aria-label="Abrir menu"
          >
            <lucide-icon name="menu" [size]="22" />
          </button>
          <div class="topbar__brand">
            <lucide-icon name="utensils" [size]="18" color="var(--b-primary-500)" />
            <span>Comandou</span>
          </div>
        </header>

        <!-- Conteúdo da rota -->
        <div class="content">
          <router-outlet />
        </div>

      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100dvh; overflow: hidden; }

    .shell {
      display: flex;
      height: 100dvh;
      overflow: hidden;
      background-color: var(--b-bg);
      position: relative;
    }

    /* ===== OVERLAY ===== */
    .overlay {
      display: none;

      @media (max-width: 1023px) {
        display: block;
        position: fixed;
        inset: 0;
        background-color: rgba(0, 0, 0, 0.45);
        z-index: 199;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease;

        &--visible {
          opacity: 1;
          pointer-events: auto;
        }
      }
    }

    /* ===== SIDEBAR ===== */
    .sidebar {
      width: 220px;
      flex-shrink: 0;
      background-color: var(--b-bg-elevated);
      border-right: 1px solid var(--b-neutral-100);
      display: flex;
      flex-direction: column;
      height: 100dvh;
      position: sticky;
      top: 0;

      @media (max-width: 1023px) {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        z-index: 200;
        transform: translateX(-100%);
        transition: transform 0.25s ease;
        box-shadow: var(--b-shadow-3);

        &--open { transform: translateX(0); }
      }
    }

    .sidebar__brand {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
      padding: var(--b-space-5) var(--b-space-4) var(--b-space-4);
      border-bottom: 1px solid var(--b-neutral-100);
      font-size: var(--b-font-size-xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
      flex-shrink: 0;
    }

    .sidebar__close {
      display: none;
      position: absolute;
      top: var(--b-space-3);
      right: var(--b-space-3);
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      color: var(--b-fg-muted);
      cursor: pointer;
      border-radius: var(--b-radius-sm);
      align-items: center;
      justify-content: center;

      &:hover { background-color: var(--b-bg-sunken); }

      @media (max-width: 1023px) { display: flex; }
    }

    .sidebar__nav {
      flex: 1;
      list-style: none;
      margin: 0;
      padding: var(--b-space-3);
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }

    .sidebar__link {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
      width: 100%;
      padding: var(--b-space-2) var(--b-space-3);
      border-radius: var(--b-radius-sm);
      text-decoration: none;
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-medium);
      color: var(--b-fg-muted);
      min-height: 44px;
      transition: background-color 0.1s, color 0.1s;

      &:hover { background-color: var(--b-bg-sunken); color: var(--b-fg); }
      &--active { background-color: var(--b-primary-50); color: var(--b-primary-600); font-weight: var(--b-font-weight-semibold); }
    }

    .sidebar__footer {
      padding: var(--b-space-3) var(--b-space-4) var(--b-space-4);
      border-top: 1px solid var(--b-neutral-100);
      display: flex;
      flex-direction: column;
      gap: var(--b-space-2);
      flex-shrink: 0;
    }

    .sidebar__user {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
    }

    .sidebar__avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background-color: var(--b-primary-100);
      color: var(--b-primary-700);
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-extrabold);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .sidebar__user-info {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    .sidebar__user-nome {
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar__user-perfil {
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-muted);
      text-transform: capitalize;
    }

    .sidebar__logout {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
      width: 100%;
      padding: var(--b-space-2) var(--b-space-3);
      border: 1px solid var(--b-neutral-200);
      border-radius: var(--b-radius-sm);
      background-color: transparent;
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-medium);
      color: var(--b-fg-muted);
      cursor: pointer;
      font-family: var(--b-font-sans);
      min-height: 40px;
      transition: background-color 0.1s, color 0.1s, border-color 0.1s;

      &:hover { background-color: var(--b-danger-50); color: var(--b-danger-600); border-color: var(--b-danger-200); }
    }

    /* ===== MAIN ===== */
    .main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      height: 100dvh;
      overflow: hidden;
    }

    /* ===== TOPBAR (mobile only) ===== */
    .topbar {
      display: none;
      align-items: center;
      gap: var(--b-space-3);
      height: 56px;
      padding: 0 var(--b-space-4);
      background-color: var(--b-bg-elevated);
      border-bottom: 1px solid var(--b-neutral-100);
      flex-shrink: 0;
      z-index: 10;

      @media (max-width: 1023px) { display: flex; }
    }

    .topbar__menu {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border: none;
      background: transparent;
      color: var(--b-fg-muted);
      cursor: pointer;
      border-radius: var(--b-radius-sm);
      flex-shrink: 0;

      &:hover { background-color: var(--b-bg-sunken); color: var(--b-fg); }
    }

    .topbar__brand {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
      font-size: var(--b-font-size-lg);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
    }

    /* ===== IMPERSONATION BANNER ===== */
    .impersonation-banner {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
      padding: var(--b-space-2) var(--b-space-4);
      background-color: var(--b-warning-100);
      border-bottom: 1px solid var(--b-warning-300);
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-medium);
      color: var(--b-warning-800);
      flex-shrink: 0;

      strong { font-weight: var(--b-font-weight-bold); }
    }

    .impersonation-banner__exit {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      margin-left: auto;
      padding: var(--b-space-1) var(--b-space-2);
      border: 1px solid var(--b-warning-400);
      border-radius: var(--b-radius-sm);
      background: transparent;
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-warning-800);
      cursor: pointer;
      font-family: var(--b-font-sans);
      min-height: 28px;
      transition: background-color 0.1s;

      &:hover { background-color: var(--b-warning-200); }
    }

    /* ===== CONTENT ===== */
    .content {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    }
  `],
})
export class ShellComponent {
  private readonly authService = inject(AuthService);
  private readonly masterAuthService = inject(MasterAuthService);

  protected readonly currentUser = currentUser;
  protected readonly navLinks = computed(() => NAV_CONFIG[userPerfil() ?? 'garcom'] ?? []);
  protected readonly drawerOpen = signal(false);
  protected readonly impersonating = masterImpersonating;

  protected async logout(): Promise<void> {
    await this.authService.logout();
  }

  protected exitImpersonation(): void {
    this.masterAuthService.exitImpersonation();
  }
}
