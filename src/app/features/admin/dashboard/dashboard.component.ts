import { Component, inject, computed, resource } from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../admin.service';
import { currentUser } from '../../../core/auth/auth.signal';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { CurrencyBrPipe } from '../../../shared/pipes/currency-br.pipe';

interface NavLink {
  label: string;
  icon: string;
  rota: string;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Produtos',    icon: 'package',    rota: '/admin/produtos'   },
  { label: 'Categorias',  icon: 'tag',        rota: '/admin/categorias' },
  { label: 'Mesas',       icon: 'layout-grid', rota: '/admin/mesas'    },
  { label: 'Usuários',    icon: 'users',      rota: '/admin/usuarios'   },
  { label: 'Relatórios',  icon: 'bar-chart-2', rota: '/admin/relatorios'},
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [SkeletonComponent, CurrencyBrPipe],
  template: `
    <div class="layout">
      <!-- Sidebar -->
      <nav class="sidebar">
        <div class="sidebar__brand">
          <i data-lucide="utensils" style="width:28px;height:28px;color:var(--b-primary-500)"></i>
          <span class="sidebar__nome">Comandou</span>
        </div>

        <ul class="sidebar__links">
          <li>
            <button class="sidebar__link sidebar__link--active" aria-current="page">
              <i data-lucide="layout-dashboard" style="width:18px;height:18px"></i>
              Dashboard
            </button>
          </li>
          @for (link of navLinks; track link.rota) {
            <li>
              <button class="sidebar__link" (click)="navegar(link.rota)">
                <i [attr.data-lucide]="link.icon" style="width:18px;height:18px"></i>
                {{ link.label }}
              </button>
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
        </div>
      </nav>

      <!-- Main -->
      <main class="main">
        <div class="main__header">
          <div>
            <h1 class="main__title">Dashboard</h1>
            <p class="main__sub">Visão geral de hoje</p>
          </div>
          <button
            class="btn-reload"
            (click)="dados.reload()"
            [disabled]="dados.isLoading()"
            aria-label="Atualizar"
          >
            <i
              data-lucide="refresh-cw"
              style="width:16px;height:16px"
              [class.spin]="dados.isLoading()"
            ></i>
            Atualizar
          </button>
        </div>

        <!-- KPI Cards -->
        <div class="kpi-grid">
          @if (dados.isLoading()) {
            @for (i of skeletons4; track i) {
              <div class="kpi-card kpi-card--skeleton">
                <app-skeleton height="0.875rem" width="60%" />
                <app-skeleton height="2rem" width="80%" />
                <app-skeleton height="0.75rem" width="40%" />
              </div>
            }
          } @else if (dados.value()) {
            <div class="kpi-card">
              <div class="kpi-card__icon kpi-card__icon--primary">
                <i data-lucide="trending-up" style="width:20px;height:20px"></i>
              </div>
              <div class="kpi-card__body">
                <span class="kpi-card__label">Receita hoje</span>
                <span class="kpi-card__valor">{{ dados.value()!.relatorio.totalVendas | currencyBr }}</span>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-card__icon kpi-card__icon--success">
                <i data-lucide="receipt" style="width:20px;height:20px"></i>
              </div>
              <div class="kpi-card__body">
                <span class="kpi-card__label">Comandas fechadas</span>
                <span class="kpi-card__valor">{{ dados.value()!.relatorio.totalComandas }}</span>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-card__icon kpi-card__icon--warning">
                <i data-lucide="calculator" style="width:20px;height:20px"></i>
              </div>
              <div class="kpi-card__body">
                <span class="kpi-card__label">Ticket médio</span>
                <span class="kpi-card__valor">{{ dados.value()!.relatorio.ticketMedio | currencyBr }}</span>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-card__icon kpi-card__icon--info">
                <i data-lucide="table-2" style="width:20px;height:20px"></i>
              </div>
              <div class="kpi-card__body">
                <span class="kpi-card__label">Mesas ocupadas</span>
                <span class="kpi-card__valor">
                  {{ mesasOcupadas() }}
                  <span class="kpi-card__sub">/ {{ dados.value()!.mesas.length }}</span>
                </span>
              </div>
            </div>
          }
        </div>

        <!-- Bottom section -->
        <div class="bottom-grid">
          <!-- Top produtos -->
          <section class="card">
            <h2 class="card__title">
              <i data-lucide="star" style="width:16px;height:16px;color:var(--b-warning-500)"></i>
              Top produtos hoje
            </h2>
            @if (dados.isLoading()) {
              @for (i of skeletons5; track i) {
                <div class="top-row top-row--skeleton">
                  <app-skeleton height="1rem" width="50%" />
                  <app-skeleton height="1rem" width="25%" />
                </div>
              }
            } @else if (!(dados.value()?.relatorio?.topProdutos?.length)) {
              <div class="vazio">Nenhuma venda registrada hoje</div>
            } @else {
              @for (p of dados.value()!.relatorio.topProdutos; track p.produto; let idx = $index) {
                <div class="top-row">
                  <div class="top-row__rank">{{ idx + 1 }}</div>
                  <div class="top-row__info">
                    <span class="top-row__nome">{{ p.produto }}</span>
                    <span class="top-row__qtd">{{ p.quantidade }} vendido{{ p.quantidade !== 1 ? 's' : '' }}</span>
                  </div>
                  <span class="top-row__total">{{ p.total | currencyBr }}</span>
                </div>
                <!-- Barra de progresso relativa ao 1º -->
                <div class="top-bar">
                  <div
                    class="top-bar__fill"
                    [style.width.%]="barraLargura(idx)"
                  ></div>
                </div>
              }
            }
          </section>

          <!-- Comandas abertas -->
          <section class="card">
            <h2 class="card__title">
              <i data-lucide="file-text" style="width:16px;height:16px;color:var(--b-primary-500)"></i>
              Comandas abertas agora
              @if (!dados.isLoading() && dados.value()) {
                <span class="card__badge">{{ dados.value()!.comandasAbertas.length }}</span>
              }
            </h2>
            @if (dados.isLoading()) {
              @for (i of skeletons4; track i) {
                <div class="comanda-row comanda-row--skeleton">
                  <app-skeleton height="1rem" width="40%" />
                  <app-skeleton height="1rem" width="30%" />
                </div>
              }
            } @else if (!(dados.value()?.comandasAbertas?.length)) {
              <div class="vazio">
                <i data-lucide="check-circle-2" style="width:24px;height:24px;color:var(--b-success-500)"></i>
                Nenhuma comanda aberta
              </div>
            } @else {
              @for (c of dados.value()!.comandasAbertas.slice(0, 8); track c.id) {
                <div class="comanda-row" (click)="navegar('/caixa/comanda/' + c.id)">
                  <div class="comanda-row__mesa">
                    Mesa {{ c.mesa?.numero ?? '—' }}
                  </div>
                  <div class="comanda-row__meta">
                    <span>{{ c.itens.length }} itens</span>
                    <span class="comanda-row__total">{{ c.total | currencyBr }}</span>
                  </div>
                </div>
              }
              @if (dados.value()!.comandasAbertas.length > 8) {
                <button class="ver-mais" (click)="navegar('/caixa/comandas')">
                  Ver todas ({{ dados.value()!.comandasAbertas.length }})
                </button>
              }
            }
          </section>

          <!-- Atalhos -->
          <section class="card atalhos-card">
            <h2 class="card__title">
              <i data-lucide="zap" style="width:16px;height:16px;color:var(--b-warning-500)"></i>
              Acesso rápido
            </h2>
            <div class="atalhos-grid">
              @for (link of navLinks; track link.rota) {
                <button class="atalho" (click)="navegar(link.rota)">
                  <i [attr.data-lucide]="link.icon" style="width:22px;height:22px"></i>
                  <span>{{ link.label }}</span>
                </button>
              }
            </div>
          </section>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      min-height: 100dvh;
      background-color: var(--b-bg);
      font-family: var(--b-font-sans);
    }

    /* ===== SIDEBAR ===== */
    .sidebar {
      width: 220px;
      flex-shrink: 0;
      background-color: var(--b-bg-elevated);
      border-right: 1px solid var(--b-neutral-100);
      display: flex;
      flex-direction: column;
      padding: var(--b-space-5) 0;
      position: sticky;
      top: 0;
      height: 100dvh;

      @media (max-width: 767px) {
        display: none;
      }
    }

    .sidebar__brand {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
      padding: 0 var(--b-space-4) var(--b-space-5);
      border-bottom: 1px solid var(--b-neutral-100);
      margin-bottom: var(--b-space-3);
    }

    .sidebar__nome {
      font-size: var(--b-font-size-xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
    }

    .sidebar__links {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 0 var(--b-space-3);
    }

    .sidebar__link {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
      width: 100%;
      padding: var(--b-space-2) var(--b-space-3);
      border-radius: var(--b-radius-sm);
      border: none;
      background-color: transparent;
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-medium);
      color: var(--b-fg-muted);
      cursor: pointer;
      font-family: var(--b-font-sans);
      text-align: left;
      min-height: 44px;
      transition: background-color 0.1s, color 0.1s;

      &:hover { background-color: var(--b-bg-sunken); color: var(--b-fg); }

      &--active {
        background-color: var(--b-primary-50);
        color: var(--b-primary-600);
        font-weight: var(--b-font-weight-semibold);
      }
    }

    .sidebar__footer {
      padding: var(--b-space-4) var(--b-space-4) 0;
      border-top: 1px solid var(--b-neutral-100);
      margin-top: var(--b-space-3);
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
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-extrabold);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .sidebar__user-info {
      display: flex;
      flex-direction: column;
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

    /* ===== MAIN ===== */
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--b-space-5);
      padding: var(--b-space-6);
      min-width: 0;

      @media (max-width: 767px) {
        padding: var(--b-space-4);
      }
    }

    .main__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--b-space-4);
    }

    .main__title {
      font-size: var(--b-font-size-3xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
      margin: 0;
    }

    .main__sub {
      font-size: var(--b-font-size-sm);
      color: var(--b-fg-muted);
      margin: var(--b-space-1) 0 0;
    }

    .btn-reload {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
      padding: var(--b-space-2) var(--b-space-3);
      border-radius: var(--b-radius-sm);
      border: 1px solid var(--b-neutral-200);
      background-color: var(--b-bg-elevated);
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-medium);
      color: var(--b-fg-muted);
      cursor: pointer;
      font-family: var(--b-font-sans);
      white-space: nowrap;
      min-height: 44px;

      &:hover:not(:disabled) { background-color: var(--b-bg-sunken); color: var(--b-fg); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    /* ===== KPI GRID ===== */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--b-space-4);

      @media (min-width: 1024px) {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    .kpi-card {
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-md);
      border: 1px solid var(--b-neutral-100);
      box-shadow: var(--b-shadow-1);
      padding: var(--b-space-4);
      display: flex;
      align-items: center;
      gap: var(--b-space-3);

      &--skeleton {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--b-space-3);
      }
    }

    .kpi-card__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: var(--b-radius-md);
      flex-shrink: 0;

      &--primary { background-color: var(--b-primary-100); color: var(--b-primary-600); }
      &--success { background-color: var(--b-success-100); color: var(--b-success-600); }
      &--warning { background-color: var(--b-warning-100); color: var(--b-warning-600); }
      &--info    { background-color: var(--b-neutral-100); color: var(--b-neutral-600); }
    }

    .kpi-card__body {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .kpi-card__label {
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg-muted);
      white-space: nowrap;
    }

    .kpi-card__valor {
      font-size: var(--b-font-size-xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
      line-height: 1.2;
    }

    .kpi-card__sub {
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-regular);
      color: var(--b-fg-muted);
    }

    /* ===== BOTTOM GRID ===== */
    .bottom-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--b-space-4);

      @media (min-width: 768px) {
        grid-template-columns: 1fr 1fr;
      }

      @media (min-width: 1280px) {
        grid-template-columns: 1fr 1fr 300px;
      }
    }

    /* ===== CARD ===== */
    .card {
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-md);
      border: 1px solid var(--b-neutral-100);
      box-shadow: var(--b-shadow-1);
      padding: var(--b-space-5);
      display: flex;
      flex-direction: column;
      gap: var(--b-space-2);
    }

    .card__title {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg);
      margin: 0 0 var(--b-space-2);
      padding-bottom: var(--b-space-3);
      border-bottom: 1px solid var(--b-neutral-100);
    }

    .card__badge {
      margin-left: auto;
      background-color: var(--b-primary-100);
      color: var(--b-primary-700);
      border-radius: var(--b-radius-sm);
      padding: 1px var(--b-space-2);
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-bold);
    }

    /* Top produtos */
    .top-row {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
      padding: var(--b-space-2) 0;

      &--skeleton {
        gap: var(--b-space-4);
        padding: var(--b-space-3) 0;
      }
    }

    .top-row__rank {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: var(--b-neutral-100);
      color: var(--b-fg-muted);
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-bold);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .top-row__info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    .top-row__nome {
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .top-row__qtd {
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-subtle);
    }

    .top-row__total {
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-primary-600);
      flex-shrink: 0;
    }

    .top-bar {
      height: 3px;
      background-color: var(--b-neutral-100);
      border-radius: 2px;
      margin-bottom: var(--b-space-1);
    }

    .top-bar__fill {
      height: 100%;
      background-color: var(--b-primary-400);
      border-radius: 2px;
      transition: width 0.4s ease;
    }

    /* Comandas abertas */
    .comanda-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--b-space-2) var(--b-space-3);
      border-radius: var(--b-radius-sm);
      cursor: pointer;
      transition: background-color 0.1s;

      &:hover { background-color: var(--b-bg-sunken); }

      &--skeleton {
        cursor: default;
        gap: var(--b-space-8);
        padding: var(--b-space-3);

        &:hover { background-color: transparent; }
      }
    }

    .comanda-row__mesa {
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg);
    }

    .comanda-row__meta {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-muted);
    }

    .comanda-row__total {
      font-weight: var(--b-font-weight-bold);
      color: var(--b-primary-600);
    }

    .ver-mais {
      width: 100%;
      padding: var(--b-space-2);
      border: none;
      background: transparent;
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-primary-600);
      cursor: pointer;
      font-family: var(--b-font-sans);
      text-align: center;
      border-radius: var(--b-radius-sm);

      &:hover { background-color: var(--b-primary-50); }
    }

    .vazio {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--b-space-2);
      padding: var(--b-space-6) 0;
      font-size: var(--b-font-size-sm);
      color: var(--b-fg-subtle);
    }

    /* Atalhos */
    .atalhos-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--b-space-2);
      margin-top: var(--b-space-1);
    }

    .atalho {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--b-space-2);
      padding: var(--b-space-3);
      border-radius: var(--b-radius-md);
      border: 1.5px solid var(--b-neutral-200);
      background-color: var(--b-bg);
      cursor: pointer;
      font-family: var(--b-font-sans);
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg-muted);
      min-height: 72px;
      transition: background-color 0.1s, border-color 0.1s, color 0.1s;

      &:hover {
        background-color: var(--b-primary-50);
        border-color: var(--b-primary-300);
        color: var(--b-primary-600);
      }
    }

    /* Spinner */
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class DashboardComponent {
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);

  protected readonly currentUser = currentUser;
  protected readonly navLinks = NAV_LINKS;
  protected readonly skeletons4 = Array.from({ length: 4 }, (_, i) => i);
  protected readonly skeletons5 = Array.from({ length: 5 }, (_, i) => i);

  protected readonly dados = resource({
    loader: () => this.adminService.buscarDashboard(),
  });

  protected readonly mesasOcupadas = computed(
    () => (this.dados.value()?.mesas ?? []).filter(
      m => m.status === 'ocupada' || m.status === 'item_pronto'
    ).length
  );

  protected navegar(rota: string): void {
    this.router.navigateByUrl(rota);
  }

  protected barraLargura(idx: number): number {
    const top = this.dados.value()?.relatorio.topProdutos ?? [];
    if (!top.length) return 0;
    const max = top[0].total;
    return max > 0 ? (top[idx].total / max) * 100 : 0;
  }
}
