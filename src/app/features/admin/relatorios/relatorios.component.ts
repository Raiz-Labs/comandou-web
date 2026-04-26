import {
  Component,
  inject,
  signal,
  computed,
  resource,
  OnInit,
  effect,
} from '@angular/core';
import { Router } from '@angular/router';
import { AdminService } from '../admin.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { CurrencyBrPipe } from '../../../shared/pipes/currency-br.pipe';

type Periodo = 'hoje' | '7dias' | '30dias';

const PERIODO_LABEL: Record<Periodo, string> = {
  hoje: 'Hoje',
  '7dias': 'Últimos 7 dias',
  '30dias': 'Últimos 30 dias',
};

const PERIODOS: Periodo[] = ['hoje', '7dias', '30dias'];

@Component({
  selector: 'app-relatorios',
  standalone: true,
  imports: [SkeletonComponent, CurrencyBrPipe],
  template: `
    <div class="layout">
      <!-- Topbar -->
      <header class="topbar">
        <button class="btn-back" (click)="router.navigateByUrl('/admin/dashboard')" aria-label="Voltar">
          <i data-lucide="arrow-left" style="width:18px;height:18px"></i>
        </button>
        <div class="topbar__info">
          <h1 class="topbar__title">Relatório de vendas</h1>
          @if (relatorio.value()) {
            <span class="topbar__sub">Atualizado agora</span>
          }
        </div>
        <button class="btn-refresh" (click)="relatorio.reload()" [disabled]="relatorio.isLoading()" aria-label="Atualizar">
          <i data-lucide="refresh-cw" style="width:16px;height:16px" [class.spin]="relatorio.isLoading()"></i>
        </button>
      </header>

      <!-- Período -->
      <div class="periodo-bar">
        @for (p of periodos; track p) {
          <button class="periodo-btn" [class.periodo-btn--active]="periodo() === p" (click)="setPeriodo(p)">
            {{ periodoLabel(p) }}
          </button>
        }
      </div>

      <main class="content">
        @if (relatorio.isLoading()) {
          <!-- KPI skeletons -->
          <div class="kpi-grid">
            @for (i of [1,2,3]; track i) {
              <div class="kpi-card">
                <app-skeleton height="0.875rem" width="120px" />
                <app-skeleton height="2rem" width="100px" />
                <app-skeleton height="0.75rem" width="80px" />
              </div>
            }
          </div>
          <!-- Chart skeleton -->
          <div class="section">
            <app-skeleton height="1.25rem" width="180px" />
            <div class="chart-area">
              <app-skeleton height="100%" width="100%" />
            </div>
          </div>
          <!-- Top produtos skeleton -->
          <div class="section">
            <app-skeleton height="1.25rem" width="160px" />
            @for (i of [1,2,3,4,5]; track i) {
              <div class="top-row-skeleton">
                <app-skeleton height="1rem" width="40%" />
                <app-skeleton height="1rem" width="60px" />
                <app-skeleton height="1rem" width="80px" />
              </div>
            }
          </div>
        } @else if (relatorio.error()) {
          <div class="empty-state">
            <i data-lucide="wifi-off" style="width:40px;height:40px;color:var(--b-fg-subtle)"></i>
            <p>Erro ao carregar o relatório</p>
            <button class="b-btn-secondary" (click)="relatorio.reload()">Tentar novamente</button>
          </div>
        } @else if (relatorio.value()) {
          <!-- KPIs -->
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-card__label">
                <i data-lucide="trending-up" style="width:14px;height:14px"></i>
                Total em vendas
              </div>
              <div class="kpi-card__valor kpi-card__valor--primary">{{ relatorio.value()!.totalVendas | currencyBr }}</div>
              <div class="kpi-card__sub">{{ periodoLabel(periodo()) }}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-card__label">
                <i data-lucide="receipt" style="width:14px;height:14px"></i>
                Comandas fechadas
              </div>
              <div class="kpi-card__valor">{{ relatorio.value()!.totalComandas }}</div>
              <div class="kpi-card__sub">comandas no período</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-card__label">
                <i data-lucide="divide-circle" style="width:14px;height:14px"></i>
                Ticket médio
              </div>
              <div class="kpi-card__valor">{{ relatorio.value()!.ticketMedio | currencyBr }}</div>
              <div class="kpi-card__sub">por comanda</div>
            </div>
          </div>

          <!-- Gráfico de barras — vendas por dia -->
          @if (relatorio.value()!.vendasPorDia.length > 0) {
            <div class="section">
              <h2 class="section__title">Vendas por dia</h2>
              <div class="chart-wrap">
                <div class="chart-area">
                  @for (dia of relatorio.value()!.vendasPorDia; track dia.data) {
                    <div class="bar-col">
                      <div class="bar-label-top">{{ dia.total | currencyBr }}</div>
                      <div class="bar-track">
                        <div class="bar-fill"
                          [style.height.%]="barAltura(dia.total)">
                        </div>
                      </div>
                      <div class="bar-label-day">{{ formatarDia(dia.data) }}</div>
                    </div>
                  }
                </div>
              </div>
            </div>
          }

          <!-- Top produtos -->
          @if (relatorio.value()!.topProdutos.length > 0) {
            <div class="section">
              <h2 class="section__title">Top produtos</h2>
              <div class="top-table">
                <div class="top-table__header">
                  <span>Produto</span>
                  <span class="top-table__qtd">Qtd</span>
                  <span class="top-table__total">Total</span>
                </div>
                @for (item of relatorio.value()!.topProdutos; track item.produto; let i = $index) {
                  <div class="top-row">
                    <div class="top-row__rank">{{ i + 1 }}</div>
                    <div class="top-row__info">
                      <div class="top-row__nome">{{ item.produto }}</div>
                      <div class="top-row__bar">
                        <div class="top-row__bar-fill"
                          [style.width.%]="barProduto(item.total)">
                        </div>
                      </div>
                    </div>
                    <span class="top-row__qtd">{{ item.quantidade }}x</span>
                    <span class="top-row__total">{{ item.total | currencyBr }}</span>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Sem dados -->
          @if (relatorio.value()!.totalComandas === 0) {
            <div class="sem-dados">
              <i data-lucide="bar-chart-2" style="width:48px;height:48px;color:var(--b-fg-subtle)"></i>
              <p class="sem-dados__title">Sem dados para este período</p>
              <p class="sem-dados__sub">Nenhuma comanda foi fechada em "{{ periodoLabel(periodo()) }}".</p>
            </div>
          }
        }
      </main>
    </div>
  `,
  styles: [`
    .layout { display: flex; flex-direction: column; min-height: 100dvh; background-color: var(--b-bg); font-family: var(--b-font-sans); }

    /* Topbar */
    .topbar { display: flex; align-items: center; gap: var(--b-space-3); padding: var(--b-space-4) var(--b-space-6); background-color: var(--b-bg-elevated); border-bottom: 1px solid var(--b-neutral-100); box-shadow: var(--b-shadow-1); }
    .btn-back { display: flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; border-radius: var(--b-radius-sm); border: 1px solid var(--b-neutral-200); background: transparent; color: var(--b-fg); cursor: pointer; flex-shrink: 0; &:hover { background-color: var(--b-bg-sunken); } }
    .topbar__info { flex: 1; }
    .topbar__title { font-size: var(--b-font-size-2xl); font-weight: var(--b-font-weight-extrabold); color: var(--b-fg); margin: 0; }
    .topbar__sub { font-size: var(--b-font-size-xs); color: var(--b-fg-muted); }
    .btn-refresh { display: flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; border-radius: var(--b-radius-sm); border: 1px solid var(--b-neutral-200); background: transparent; color: var(--b-fg-muted); cursor: pointer; &:hover:not(:disabled) { background-color: var(--b-bg-sunken); color: var(--b-fg); } &:disabled { opacity: 0.5; cursor: not-allowed; } }

    /* Período */
    .periodo-bar { display: flex; gap: var(--b-space-2); padding: var(--b-space-3) var(--b-space-6); background-color: var(--b-bg-elevated); border-bottom: 1px solid var(--b-neutral-100); }
    .periodo-btn { padding: var(--b-space-2) var(--b-space-4); border-radius: var(--b-radius-sm); border: 1px solid var(--b-neutral-200); background: transparent; font-size: var(--b-font-size-sm); font-weight: var(--b-font-weight-medium); color: var(--b-fg-muted); cursor: pointer; font-family: var(--b-font-sans); min-height: 40px; transition: all 0.15s; &:hover { background-color: var(--b-bg-sunken); } &--active { background-color: var(--b-primary-500); border-color: var(--b-primary-500); color: var(--b-fg-inverted); font-weight: var(--b-font-weight-semibold); } }

    /* Content */
    .content { flex: 1; padding: var(--b-space-6); display: flex; flex-direction: column; gap: var(--b-space-6); }

    /* KPIs */
    .kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--b-space-4); }
    .kpi-card { background-color: var(--b-bg-elevated); border-radius: var(--b-radius-md); border: 1px solid var(--b-neutral-100); box-shadow: var(--b-shadow-1); padding: var(--b-space-5); display: flex; flex-direction: column; gap: var(--b-space-2); }
    .kpi-card__label { display: flex; align-items: center; gap: var(--b-space-2); font-size: var(--b-font-size-xs); font-weight: var(--b-font-weight-semibold); color: var(--b-fg-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .kpi-card__valor { font-size: var(--b-font-size-3xl); font-weight: var(--b-font-weight-extrabold); color: var(--b-fg); line-height: 1; &--primary { color: var(--b-primary-500); } }
    .kpi-card__sub { font-size: var(--b-font-size-xs); color: var(--b-fg-muted); }

    /* Seções */
    .section { background-color: var(--b-bg-elevated); border-radius: var(--b-radius-md); border: 1px solid var(--b-neutral-100); box-shadow: var(--b-shadow-1); padding: var(--b-space-5); display: flex; flex-direction: column; gap: var(--b-space-4); }
    .section__title { font-size: var(--b-font-size-lg); font-weight: var(--b-font-weight-bold); color: var(--b-fg); margin: 0; }

    /* Gráfico de barras */
    .chart-wrap { overflow-x: auto; }
    .chart-area { display: flex; align-items: flex-end; gap: var(--b-space-2); min-height: 180px; padding-top: var(--b-space-4); padding-bottom: var(--b-space-1); }
    .bar-col { display: flex; flex-direction: column; align-items: center; gap: var(--b-space-1); flex: 1; min-width: 40px; }
    .bar-label-top { font-size: 10px; color: var(--b-fg-muted); white-space: nowrap; font-weight: var(--b-font-weight-semibold); }
    .bar-track { width: 100%; height: 140px; background-color: var(--b-bg-sunken); border-radius: var(--b-radius-sm); display: flex; align-items: flex-end; overflow: hidden; }
    .bar-fill { width: 100%; background-color: var(--b-primary-500); border-radius: var(--b-radius-sm); transition: height 0.5s ease; min-height: 4px; }
    .bar-label-day { font-size: 10px; color: var(--b-fg-muted); text-align: center; white-space: nowrap; }

    /* Top produtos */
    .top-table { display: flex; flex-direction: column; gap: var(--b-space-1); }
    .top-table__header { display: grid; grid-template-columns: 1fr 48px 96px; gap: var(--b-space-3); padding: var(--b-space-2) var(--b-space-3); font-size: var(--b-font-size-xs); font-weight: var(--b-font-weight-bold); color: var(--b-fg-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .top-table__qtd, .top-table__total { text-align: right; }
    .top-row { display: grid; grid-template-columns: 28px 1fr 48px 96px; gap: var(--b-space-3); align-items: center; padding: var(--b-space-2) var(--b-space-3); border-radius: var(--b-radius-sm); &:hover { background-color: var(--b-bg-sunken); } }
    .top-row__rank { font-size: var(--b-font-size-xs); font-weight: var(--b-font-weight-bold); color: var(--b-fg-muted); width: 24px; height: 24px; border-radius: 50%; background-color: var(--b-bg-sunken); display: flex; align-items: center; justify-content: center; }
    .top-row__info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .top-row__nome { font-size: var(--b-font-size-sm); font-weight: var(--b-font-weight-semibold); color: var(--b-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .top-row__bar { height: 4px; background-color: var(--b-bg-sunken); border-radius: 2px; overflow: hidden; }
    .top-row__bar-fill { height: 100%; background-color: var(--b-primary-400); border-radius: 2px; }
    .top-row__qtd { font-size: var(--b-font-size-sm); color: var(--b-fg-muted); text-align: right; }
    .top-row__total { font-size: var(--b-font-size-sm); font-weight: var(--b-font-weight-bold); color: var(--b-primary-600); text-align: right; }
    .top-row-skeleton { display: flex; align-items: center; gap: var(--b-space-3); padding: var(--b-space-2) 0; }

    /* Sem dados */
    .sem-dados { display: flex; flex-direction: column; align-items: center; gap: var(--b-space-3); padding: var(--b-space-12) var(--b-space-4); text-align: center; }
    .sem-dados__title { font-size: var(--b-font-size-lg); font-weight: var(--b-font-weight-semibold); color: var(--b-fg); margin: 0; }
    .sem-dados__sub { font-size: var(--b-font-size-sm); color: var(--b-fg-muted); margin: 0; }

    .empty-state { display: flex; flex-direction: column; align-items: center; gap: var(--b-space-3); padding: var(--b-space-16) var(--b-space-4); text-align: center; color: var(--b-fg-muted); font-size: var(--b-font-size-sm); }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class RelatoriosComponent implements OnInit {
  protected readonly router = inject(Router);
  private readonly adminService = inject(AdminService);

  protected readonly periodos = PERIODOS;
  protected readonly periodo = signal<Periodo>('hoje');

  protected readonly relatorio = resource({
    loader: () => this.adminService.buscarRelatorio(this.periodo()),
  });

  // Recarga automática ao trocar período
  constructor() {
    effect(() => {
      this.periodo(); // rastreia
      this.relatorio.reload();
    });
  }

  ngOnInit(): void {
    setTimeout(() => this.initLucide(), 100);
  }

  protected periodoLabel(p: Periodo): string {
    return PERIODO_LABEL[p];
  }

  protected setPeriodo(p: Periodo): void {
    if (this.periodo() === p) return;
    this.periodo.set(p);
  }

  protected barAltura(total: number): number {
    const max = Math.max(...(this.relatorio.value()?.vendasPorDia.map(d => d.total) ?? [1]), 1);
    return Math.round((total / max) * 100);
  }

  protected barProduto(total: number): number {
    const max = Math.max(...(this.relatorio.value()?.topProdutos.map(p => p.total) ?? [1]), 1);
    return Math.round((total / max) * 100);
  }

  protected formatarDia(data: string): string {
    try {
      const d = new Date(data + 'T00:00:00');
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return data;
    }
  }

  private initLucide(): void {
    const win = window as unknown as { lucide?: { createIcons: () => void } };
    win.lucide?.createIcons();
  }
}
