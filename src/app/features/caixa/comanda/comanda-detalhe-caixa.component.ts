import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  resource,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { CaixaService, DivisaoConta } from '../caixa.service';
import { SocketService } from '../../../core/socket/socket.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ConnectionBannerComponent } from '../../../shared/components/connection-banner/connection-banner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CurrencyBrPipe } from '../../../shared/pipes/currency-br.pipe';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-comanda-detalhe-caixa',
  standalone: true,
  imports: [
    SkeletonComponent,
    ConnectionBannerComponent,
    StatusBadgeComponent,
    ConfirmDialogComponent,
    CurrencyBrPipe,
    LucideAngularModule,
  ],
  template: `
    <div class="layout">
      <app-connection-banner />

      <header class="header">
        <button class="b-btn-back" (click)="voltar()" aria-label="Voltar">
          <lucide-icon name="arrow-left" [size]="20" />
        </button>

        <div class="header__info">
          @if (comanda.isLoading()) {
            <app-skeleton height="1.5rem" width="180px" />
            <app-skeleton height="1rem" width="100px" />
          } @else if (comanda.hasValue()) {
            <h1 class="header__title">
              Mesa {{ comanda.value()!.mesa?.numero ?? '—' }}
              <span class="header__id">#{{ comanda.value()!.id.slice(-6).toUpperCase() }}</span>
            </h1>
            <span class="header__sub">
              @if (comanda.value()!.nomeCliente) {
                <lucide-icon name="user" [size]="13" />
                {{ comanda.value()!.nomeCliente }} ·
              }
              Aberta {{ tempoAberta(comanda.value()!.criadoEm) }} atrás
            </span>
          }
        </div>

        @if (!comanda.isLoading() && comanda.hasValue()) {
          <div class="header__total">
            <span class="header__total-label">Total</span>
            <span class="header__total-valor">{{ totalAtivo() | currencyBr }}</span>
          </div>
        }
      </header>

      <div class="page">
        <!-- Coluna esquerda: itens -->
        <section class="itens-section">
          <h2 class="section-title">
            <lucide-icon name="package" [size]="16" />
            Itens do pedido
          </h2>

          @if (comanda.isLoading()) {
            @for (i of skeletons; track i) {
              <div class="item-row item-row--skeleton">
                <app-skeleton height="1rem" width="55%" />
                <app-skeleton height="0.875rem" width="30%" />
                <app-skeleton height="1rem" width="20%" />
              </div>
            }
          } @else if (comanda.error()) {
            <div class="empty-state">
              <lucide-icon name="wifi-off" [size]="40" color="var(--b-fg-subtle)" />
              <p>Erro ao carregar comanda</p>
              <button class="b-btn-secondary" (click)="comanda.reload()">Tentar novamente</button>
            </div>
          } @else {
            <!-- Itens ativos -->
            @for (item of itensAtivos(); track item.id) {
              <div class="item-row">
                <div class="item-row__info">
                  <span class="item-row__nome">{{ item.produto?.nome ?? 'Produto' }}</span>
                  @if (item.observacao) {
                    <span class="item-row__obs">{{ item.observacao }}</span>
                  }
                </div>
                <div class="item-row__right">
                  <app-status-badge [status]="item.status" />
                  <span class="item-row__qtd">{{ item.quantidade }}x</span>
                  <span class="item-row__total">{{ item.total | currencyBr }}</span>
                </div>
              </div>
            }

            <!-- Separador cancelados -->
            @if (itensCancelados().length > 0) {
              <div class="cancelados-sep">
                <span>Cancelados</span>
              </div>
              @for (item of itensCancelados(); track item.id) {
                <div class="item-row item-row--cancelado">
                  <span class="item-row__nome">{{ item.produto?.nome ?? 'Produto' }}</span>
                  <div class="item-row__right">
                    <app-status-badge [status]="item.status" />
                    <span class="item-row__qtd">{{ item.quantidade }}x</span>
                    <span class="item-row__total item-row__total--riscado">
                      {{ item.total | currencyBr }}
                    </span>
                  </div>
                </div>
              }
            }

            <!-- Totalizador -->
            <div class="total-box">
              <div class="total-box__row">
                <span>Subtotal</span>
                <span>{{ totalAtivo() | currencyBr }}</span>
              </div>
              @if (itensCancelados().length > 0) {
                <div class="total-box__row total-box__row--muted">
                  <span>Cancelados</span>
                  <span>{{ totalCancelado() | currencyBr }}</span>
                </div>
              }
              <div class="total-box__row total-box__row--total">
                <span>Total a pagar</span>
                <span>{{ totalAtivo() | currencyBr }}</span>
              </div>
            </div>
          }
        </section>

        <!-- Coluna direita: fechamento -->
        @if (!comanda.isLoading() && comanda.hasValue() && comanda.value().aberta) {
          <aside class="fechamento-section">
            <h2 class="section-title">
              <lucide-icon name="calculator" [size]="16" />
              Fechamento
            </h2>

            <!-- Divisão de conta -->
            <div class="divisao-card">
              <div class="divisao-card__header">
                <lucide-icon name="users" [size]="16" color="var(--b-primary-500)" />
                <span class="divisao-card__titulo">Dividir conta</span>
              </div>

              <div class="divisao-control">
                <button
                  class="divisao-btn"
                  (click)="decrementarDivisoes()"
                  [disabled]="divisoes() <= 1"
                  aria-label="Diminuir"
                >
                  <lucide-icon name="minus" [size]="16" />
                </button>
                <div class="divisao-display">
                  <span class="divisao-num">{{ divisoes() }}</span>
                  <span class="divisao-label">{{ divisoes() === 1 ? 'pessoa' : 'pessoas' }}</span>
                </div>
                <button
                  class="divisao-btn"
                  (click)="incrementarDivisoes()"
                  aria-label="Aumentar"
                >
                  <lucide-icon name="plus" [size]="16" />
                </button>
              </div>

              @if (divisoes() > 1) {
                <div class="divisao-resultado">
                  <span class="divisao-resultado__label">Cada pessoa paga</span>
                  <span class="divisao-resultado__valor">
                    {{ valorPorPessoa() | currencyBr }}
                  </span>
                </div>
              }
            </div>

            <!-- Resumo final -->
            <div class="resumo-card">
              <div class="resumo-card__linha">
                <span>Total da comanda</span>
                <strong>{{ totalAtivo() | currencyBr }}</strong>
              </div>
              @if (divisoes() > 1) {
                <div class="resumo-card__linha resumo-card__linha--destaque">
                  <span>Por pessoa ({{ divisoes() }}x)</span>
                  <strong>{{ valorPorPessoa() | currencyBr }}</strong>
                </div>
              }
            </div>

            <!-- Botão fechar -->
            <button
              class="b-btn-primary btn-fechar"
              [disabled]="fechando() || validandoDivisao()"
              (click)="pedirFechamento()"
            >
              @if (fechando()) {
                <lucide-icon name="loader-2" [size]="18" class="b-spin" />
                Fechando...
              } @else if (validandoDivisao()) {
                <lucide-icon name="loader-2" [size]="18" class="b-spin" />
                Validando divisão...
              } @else {
                <lucide-icon name="check-circle-2" [size]="18" />
                Fechar comanda
              }
            </button>
          </aside>
        }

        @if (!comanda.isLoading() && comanda.hasValue() && !comanda.value().aberta) {
          <aside class="fechamento-section">
            <div class="comanda-fechada">
              <lucide-icon name="check-circle-2" [size]="48" color="var(--b-success-500)" />
              <p class="comanda-fechada__titulo">Comanda fechada</p>
              @if (comanda.value()!.fechadoEm) {
                <p class="comanda-fechada__sub">
                  Fechada em {{ formatarData(comanda.value()!.fechadoEm!) }}
                </p>
              }
              <div class="comanda-fechada__total">
                {{ comanda.value()!.total | currencyBr }}
              </div>
            </div>
          </aside>
        }
      </div>
    </div>

    <!-- ConfirmDialog: fechar comanda -->
    @if (confirmandoFechamento()) {
      <app-confirm-dialog
        title="Fechar comanda?"
        [message]="mensagemConfirmacao()"
        confirmLabel="Confirmar fechamento"
        cancelLabel="Cancelar"
        (confirmed)="confirmarFechamento()"
        (cancelled)="confirmandoFechamento.set(false)"
      />
    }

    <!-- ConfirmDialog: itens pendentes -->
    @if (confirmandoPendentes()) {
      <app-confirm-dialog
        title="Há itens pendentes"
        [message]="'Há ' + qtdBloqueantes() + ' item(ns) ainda em preparo. Deseja fechar a comanda mesmo assim?'"
        confirmLabel="Sim, fechar mesmo assim"
        cancelLabel="Cancelar"
        [confirmDanger]="true"
        (confirmed)="confirmarFechamentoForcado()"
        (cancelled)="confirmandoPendentes.set(false)"
      />
    }
  `,
  styles: [`
    .layout {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
      background-color: var(--b-bg);
      font-family: var(--b-font-sans);
    }

    /* ===== HEADER ===== */
    .header {
      display: flex;
      align-items: center;
      gap: var(--b-space-4);
      padding: var(--b-space-4) var(--b-space-6);
      background-color: var(--b-bg-elevated);
      border-bottom: 1px solid var(--b-neutral-100);
      box-shadow: var(--b-shadow-1);
      min-height: 72px;
    }

    .header__info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .header__title {
      font-size: var(--b-font-size-2xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
      margin: 0;
      display: flex;
      align-items: baseline;
      gap: var(--b-space-2);
    }

    .header__id {
      font-family: monospace;
      font-size: var(--b-font-size-sm);
      color: var(--b-fg-subtle);
      font-weight: var(--b-font-weight-regular);
    }

    .header__sub {
      font-size: var(--b-font-size-sm);
      color: var(--b-fg-muted);
    }

    .header__total {
      text-align: right;
      flex-shrink: 0;
    }

    .header__total-label {
      display: block;
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-muted);
      font-weight: var(--b-font-weight-medium);
    }

    .header__total-valor {
      font-size: var(--b-font-size-2xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-primary-600);
    }

    /* ===== PAGE LAYOUT ===== */
    .page {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--b-space-4);
      padding: var(--b-space-4);
      align-items: start;

      @media (min-width: 768px) {
        grid-template-columns: 1fr 340px;
        padding: var(--b-space-6);
        gap: var(--b-space-6);
      }

      @media (min-width: 1024px) {
        grid-template-columns: 1fr 380px;
      }
    }

    /* ===== SECTION TITLE ===== */
    .section-title {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin: 0 0 var(--b-space-3);
    }

    /* ===== ITENS ===== */
    .itens-section {
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-md);
      border: 1px solid var(--b-neutral-100);
      box-shadow: var(--b-shadow-1);
      padding: var(--b-space-5);
    }

    .item-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--b-space-3);
      padding: var(--b-space-3) 0;
      border-bottom: 1px solid var(--b-neutral-100);

      &:last-of-type { border-bottom: none; }

      &--skeleton {
        gap: var(--b-space-4);
        flex-direction: column;
        align-items: flex-start;
      }

      &--cancelado {
        opacity: 0.5;
      }
    }

    .item-row__info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }

    .item-row__nome {
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg);
    }

    .item-row__obs {
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-muted);
      font-style: italic;
    }

    .item-row__right {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
      flex-shrink: 0;
    }

    .item-row__qtd {
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg-muted);
      min-width: 28px;
      text-align: center;
    }

    .item-row__total {
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg);
      min-width: 80px;
      text-align: right;

      &--riscado {
        text-decoration: line-through;
        color: var(--b-fg-subtle);
      }
    }

    .cancelados-sep {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-subtle);
      font-weight: var(--b-font-weight-semibold);
      padding: var(--b-space-3) 0 var(--b-space-1);

      &::before, &::after {
        content: '';
        flex: 1;
        height: 1px;
        background-color: var(--b-neutral-200);
      }
    }

    /* Totalizador */
    .total-box {
      margin-top: var(--b-space-4);
      border-top: 2px solid var(--b-neutral-200);
      padding-top: var(--b-space-3);
      display: flex;
      flex-direction: column;
      gap: var(--b-space-2);
    }

    .total-box__row {
      display: flex;
      justify-content: space-between;
      font-size: var(--b-font-size-sm);
      color: var(--b-fg-muted);

      &--muted { color: var(--b-fg-subtle); }

      &--total {
        font-size: var(--b-font-size-lg);
        font-weight: var(--b-font-weight-extrabold);
        color: var(--b-fg);
        padding-top: var(--b-space-2);
        border-top: 1px solid var(--b-neutral-200);
        margin-top: var(--b-space-1);
      }
    }

    /* ===== FECHAMENTO ===== */
    .fechamento-section {
      display: flex;
      flex-direction: column;
      gap: var(--b-space-4);
    }

    /* Divisão */
    .divisao-card {
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-md);
      border: 1.5px solid var(--b-primary-200);
      padding: var(--b-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--b-space-4);
    }

    .divisao-card__header {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
    }

    .divisao-card__titulo {
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg);
    }

    .divisao-control {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--b-space-5);
    }

    .divisao-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      border-radius: 50%;
      border: 2px solid var(--b-primary-500);
      background-color: transparent;
      color: var(--b-primary-500);
      cursor: pointer;
      transition: background-color 0.1s;

      &:hover:not(:disabled) { background-color: var(--b-primary-50); }
      &:disabled { border-color: var(--b-neutral-300); color: var(--b-neutral-300); cursor: not-allowed; }
    }

    .divisao-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 60px;
    }

    .divisao-num {
      font-size: var(--b-font-size-3xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
      line-height: 1;
    }

    .divisao-label {
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-muted);
      font-weight: var(--b-font-weight-medium);
    }

    .divisao-resultado {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--b-space-3) var(--b-space-3);
      background-color: var(--b-primary-50);
      border-radius: var(--b-radius-sm);
      border: 1px solid var(--b-primary-200);
    }

    .divisao-resultado__label {
      font-size: var(--b-font-size-sm);
      color: var(--b-primary-700);
      font-weight: var(--b-font-weight-medium);
    }

    .divisao-resultado__valor {
      font-size: var(--b-font-size-xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-primary-600);
    }

    /* Resumo */
    .resumo-card {
      background-color: var(--b-bg-sunken);
      border-radius: var(--b-radius-md);
      padding: var(--b-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--b-space-2);
    }

    .resumo-card__linha {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: var(--b-font-size-sm);
      color: var(--b-fg-muted);

      strong { color: var(--b-fg); font-weight: var(--b-font-weight-bold); }

      &--destaque {
        font-size: var(--b-font-size-md);
        color: var(--b-fg);
        font-weight: var(--b-font-weight-semibold);
        padding-top: var(--b-space-2);
        border-top: 1px solid var(--b-neutral-200);
        margin-top: var(--b-space-1);

        strong { color: var(--b-primary-600); font-size: var(--b-font-size-lg); }
      }
    }

    /* Botão fechar */
    .btn-fechar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--b-space-2);
      width: 100%;
      min-height: 52px;
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-bold);

      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }

    /* Comanda fechada */
    .comanda-fechada {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--b-space-3);
      padding: var(--b-space-8) var(--b-space-4);
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-md);
      border: 1.5px solid var(--b-success-200);
      text-align: center;
    }

    .comanda-fechada__titulo {
      font-size: var(--b-font-size-xl);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-success-700);
      margin: 0;
    }

    .comanda-fechada__sub {
      font-size: var(--b-font-size-sm);
      color: var(--b-fg-muted);
      margin: 0;
    }

    .comanda-fechada__total {
      font-size: var(--b-font-size-3xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
    }

    /* ===== EMPTY STATE ===== */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--b-space-3);
      padding: var(--b-space-10);
      text-align: center;
      color: var(--b-fg-muted);
      font-size: var(--b-font-size-sm);
    }

  `],
})
export class ComandaDetalheCaixaComponent implements OnInit, OnDestroy {
  private readonly caixaService = inject(CaixaService);
  private readonly socketService = inject(SocketService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  private readonly comandaId = this.route.snapshot.params['id'] as string;
  private subs: Subscription[] = [];

  protected readonly skeletons = Array.from({ length: 4 }, (_, i) => i);
  protected readonly divisoes = signal(1);
  protected readonly fechando = signal(false);
  protected readonly validandoDivisao = signal(false);
  protected readonly confirmandoFechamento = signal(false);
  protected readonly confirmandoPendentes = signal(false);
  protected readonly qtdBloqueantes = signal(0);
  // Divisão confirmada pelo servidor (Decimal, com rateio de resto de
  // arredondamento) — some ser a fonte de verdade na hora de fechar; o
  // valor calculado no cliente (valorPorPessoa) é só uma prévia rápida.
  private readonly divisaoServidor = signal<DivisaoConta | null>(null);

  protected readonly comanda = resource({
    loader: () => this.caixaService.buscarComanda(this.comandaId),
  });

  protected readonly itensAtivos = computed(
    () => (this.comanda.hasValue() ? this.comanda.value().itens : []).filter(i => i.status !== 'cancelado')
  );

  protected readonly itensCancelados = computed(
    () => (this.comanda.hasValue() ? this.comanda.value().itens : []).filter(i => i.status === 'cancelado')
  );

  protected readonly totalAtivo = computed(
    () => this.itensAtivos().reduce((s, i) => s + i.total, 0)
  );

  protected readonly totalCancelado = computed(
    () => this.itensCancelados().reduce((s, i) => s + i.total, 0)
  );

  protected readonly valorPorPessoa = computed(
    () => this.divisoes() > 1 ? this.totalAtivo() / this.divisoes() : this.totalAtivo()
  );

  protected readonly mensagemConfirmacao = computed(() => {
    const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    const div = this.divisoes();
    const servidor = this.divisaoServidor();
    if (div > 1 && servidor) {
      return `Total: ${fmt.format(servidor.total)} — ${servidor.partes} pessoas × ${fmt.format(servidor.porPessoa)} cada. Confirmar fechamento?`;
    }
    return `Total de ${fmt.format(this.totalAtivo())}. Confirmar fechamento?`;
  });

  ngOnInit(): void {
    this.subs.push(
      this.socketService.on<unknown>('item:atualizado').subscribe(() => {
        this.comanda.reload();
      }),
      this.socketService.on<unknown>('item:cancelado').subscribe(() => {
        this.comanda.reload();
      }),
      this.socketService.on<unknown>('comanda:fechada').subscribe(() => {
        this.comanda.reload();
      }),
    );

  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  protected voltar(): void {
    this.router.navigate(['/caixa/comandas']);
  }

  protected incrementarDivisoes(): void {
    this.divisoes.update(v => v + 1);
    this.divisaoServidor.set(null);
  }

  protected decrementarDivisoes(): void {
    this.divisoes.update(v => Math.max(1, v - 1));
    this.divisaoServidor.set(null);
  }

  protected async pedirFechamento(): Promise<void> {
    if (this.fechando() || this.validandoDivisao()) return;

    const partes = this.divisoes();
    if (partes > 1) {
      // Revalida a divisão no servidor (Decimal, com rateio de resto) antes
      // de mostrar a confirmação — o valor local é só uma prévia com float.
      this.validandoDivisao.set(true);
      try {
        const resultado = await this.caixaService.dividirConta(this.comandaId, partes);
        this.divisaoServidor.set(resultado);
        const previaLocal = this.valorPorPessoa();
        if (Math.abs(resultado.porPessoa - previaLocal) >= 0.01) {
          this.toast.danger('O valor por pessoa foi ajustado pelo servidor após o arredondamento.');
        }
      } catch {
        this.toast.danger('Não foi possível validar a divisão da conta. Tente novamente.');
        this.validandoDivisao.set(false);
        return;
      }
      this.validandoDivisao.set(false);
    }

    this.confirmandoFechamento.set(true);
  }

  protected confirmarFechamento(): void {
    this.confirmandoFechamento.set(false);
    const bloqueantes = (this.comanda.hasValue() ? this.comanda.value().itens : []).filter(
      (i) => i.status === 'pendente' || i.status === 'em_preparo'
    );
    if (bloqueantes.length > 0) {
      this.qtdBloqueantes.set(bloqueantes.length);
      this.confirmandoPendentes.set(true);
    } else {
      void this.executarFechamento(false);
    }
  }

  protected confirmarFechamentoForcado(): void {
    this.confirmandoPendentes.set(false);
    void this.executarFechamento(true);
  }

  private async executarFechamento(ignorarPendentes: boolean): Promise<void> {
    if (this.fechando()) return;
    this.fechando.set(true);
    try {
      const fechada = await this.caixaService.fecharComanda(this.comandaId, {
        divisoes: this.divisoes() > 1 ? this.divisoes() : undefined,
        ignorarPendentes,
      });
      this.toast.success('Comanda fechada com sucesso!');
      // Update otimista: o servidor já retorna a comanda fechada por
      // completo, então usamos a resposta em vez de refazer o GET.
      this.comanda.set(fechada);
    } catch {
      this.toast.danger('Não foi possível fechar a comanda. Tente novamente.');
    } finally {
      this.fechando.set(false);
    }
  }

  protected tempoAberta(criadoEm: string): string {
    const diff = Math.floor((Date.now() - new Date(criadoEm).getTime()) / 60000);
    if (diff < 60) return `${diff} min`;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  protected formatarData(data: string): string {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

}
