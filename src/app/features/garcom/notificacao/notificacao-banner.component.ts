import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { GarcomNotificacaoService } from './garcom-notificacao.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-notificacao-banner',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    @if (svc.notificacoes().length > 0) {
      <div class="banner-list" role="region" aria-label="Itens prontos para entrega">
        @for (notif of svc.notificacoes(); track notif.notifId) {
          <div class="notif">
            <div class="notif__icon">
              <lucide-icon name="bell-ring" [size]="18" />
            </div>
            <div class="notif__body">
              <span class="notif__titulo">{{ notif.produtoNome }}</span>
              @if (notif.mesaNumero) {
                <span class="notif__sub">Mesa {{ notif.mesaNumero }} — pronto para entregar</span>
              } @else {
                <span class="notif__sub">Pronto para entregar</span>
              }
            </div>
            <div class="notif__actions">
              @if (notif.comandaId) {
                <button
                  class="notif__ver"
                  (click)="verComanda(notif.comandaId!)"
                  aria-label="Ver comanda"
                >
                  Ver
                </button>
              }
              <button
                class="notif__dismiss"
                (click)="svc.dispensar(notif.notifId)"
                aria-label="Dispensar notificação"
              >
                <lucide-icon name="x" [size]="14" />
              </button>
            </div>
          </div>
        }
        @if (svc.notificacoes().length > 1) {
          <button class="dispensar-todas" (click)="svc.dispensarTodas()">
            Dispensar todas ({{ svc.notificacoes().length }})
          </button>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .banner-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
      background-color: var(--b-success-500);
    }

    .notif {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
      padding: var(--b-space-3) var(--b-space-4);
      background-color: var(--b-success-500);
      animation: slide-in 0.25s ease;
    }

    .notif__icon {
      display: flex;
      align-items: center;
      color: #fff;
      flex-shrink: 0;
    }

    .notif__body {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .notif__titulo {
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-bold);
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .notif__sub {
      font-size: var(--b-font-size-xs);
      color: rgba(255, 255, 255, 0.85);
    }

    .notif__actions {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      flex-shrink: 0;
    }

    .notif__ver {
      padding: var(--b-space-1) var(--b-space-3);
      border-radius: var(--b-radius-sm);
      border: 1.5px solid rgba(255, 255, 255, 0.7);
      background-color: transparent;
      color: #fff;
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-bold);
      font-family: var(--b-font-sans);
      min-height: 32px;
      cursor: pointer;

      &:hover { background-color: rgba(255, 255, 255, 0.15); }
    }

    .notif__dismiss {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      min-height: 32px;
      border-radius: var(--b-radius-sm);
      border: none;
      background-color: transparent;
      color: rgba(255, 255, 255, 0.75);
      cursor: pointer;

      &:hover { background-color: rgba(255, 255, 255, 0.15); color: #fff; }
    }

    .dispensar-todas {
      width: 100%;
      padding: var(--b-space-2) var(--b-space-4);
      background-color: var(--b-success-600);
      border: none;
      color: rgba(255, 255, 255, 0.85);
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-medium);
      font-family: var(--b-font-sans);
      cursor: pointer;
      text-align: center;

      &:hover { background-color: var(--b-success-700); color: #fff; }
    }

    @keyframes slide-in {
      from { transform: translateY(-100%); opacity: 0; }
      to   { transform: translateY(0);     opacity: 1; }
    }
  `],
})
export class NotificacaoBannerComponent {
  protected readonly svc = inject(GarcomNotificacaoService);
  private readonly router = inject(Router);

  protected verComanda(comandaId: string): void {
    this.router.navigate(['/garcom/comanda', comandaId]);
  }
}
