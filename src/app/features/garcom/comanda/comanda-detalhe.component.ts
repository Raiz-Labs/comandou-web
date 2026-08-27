import {
  Component,
  inject,
  signal,
  computed,
  effect,
  OnInit,
  OnDestroy,
  resource,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { ItemComanda, Produto, StatusItem } from '../../../shared/types';
import { userPerfil } from '../../../core/auth/auth.signal';
import { GarcomService } from '../garcom.service';
import { SocketService } from '../../../core/socket/socket.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ConnectionBannerComponent } from '../../../shared/components/connection-banner/connection-banner.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { NotificacaoBannerComponent } from '../notificacao/notificacao-banner.component';
import { SeletorProdutoComponent } from './seletor-produto.component';
import { ConfirmacaoItem, FormularioItemComponent } from './formulario-item.component';
import { CurrencyBrPipe } from '../../../shared/pipes/currency-br.pipe';
import { LucideAngularModule } from 'lucide-angular';

type UiStep = 'lista' | 'picker' | 'form' | 'edicao';

const EDITAVEL: StatusItem[] = ['pendente'];
const CANCELAVEL: StatusItem[] = ['pendente', 'em_preparo'];

@Component({
  selector: 'app-comanda-detalhe',
  standalone: true,
  imports: [
    SkeletonComponent,
    ConnectionBannerComponent,
    StatusBadgeComponent,
    ConfirmDialogComponent,
    NotificacaoBannerComponent,
    SeletorProdutoComponent,
    FormularioItemComponent,
    CurrencyBrPipe,
    LucideAngularModule,
  ],
  template: `
    <div class="layout">
      <app-connection-banner />
      <app-notificacao-banner />

      <!-- Header -->
      <header class="header">
        <button class="b-btn-back" (click)="voltar()" aria-label="Voltar">
          <lucide-icon name="arrow-left" [size]="20" />
        </button>
        <div class="header__info">
          @if (comanda.isLoading()) {
            <app-skeleton height="1.25rem" width="140px" />
            <app-skeleton height="0.875rem" width="100px" />
          } @else if (comanda.hasValue()) {
            <h1 class="header__title">
              @if (comanda.value()!.nomeCliente) {
                {{ comanda.value()!.nomeCliente }}
              } @else {
                Comanda #{{ comanda.value()!.id.slice(-6).toUpperCase() }}
              }
            </h1>
            @if (comanda.value()!.mesa) {
              <span class="header__sub">
                Mesa {{ comanda.value()!.mesa!.numero }}
                @if (comanda.value()!.nomeCliente) {
                  · #{{ comanda.value()!.id.slice(-6).toUpperCase() }}
                }
              </span>
            }
          }
        </div>
        @if (!comanda.isLoading() && comanda.hasValue()) {
          <div class="header__total">
            {{ totalAtivo() | currencyBr }}
          </div>
        }
      </header>

      <!-- Lista de itens -->
      <main class="content">
        @if (comanda.isLoading()) {
          @for (i of skeletonItems; track i) {
            <div class="item-card item-card--skeleton">
              <app-skeleton height="1rem" width="55%" />
              <app-skeleton height="0.875rem" width="80%" />
              <app-skeleton height="1.25rem" width="40%" />
            </div>
          }
        } @else if (comanda.error()) {
          <div class="b-empty-state">
            <lucide-icon name="wifi-off" [size]="40" color="var(--b-fg-subtle)" />
            <p class="b-empty-state__title">Erro ao carregar comanda</p>
            <button class="b-btn-secondary" (click)="comanda.reload()">
              <lucide-icon name="refresh-cw" [size]="16" />
              Tentar novamente
            </button>
          </div>
        } @else if (itensAtivos().length === 0 && itensCancelados().length === 0) {
          <div class="b-empty-state">
            <lucide-icon name="shopping-bag" [size]="48" color="var(--b-fg-subtle)" />
            <p class="b-empty-state__title">Comanda vazia</p>
            <p class="b-empty-state__sub">Toque em "Adicionar item" para começar o pedido</p>
          </div>
        } @else {
          <!-- Itens ativos -->
          @for (item of itensAtivos(); track item.id) {
            <div class="item-card">
              <div class="item-card__top">
                <span class="item-card__nome">
                  {{ item.produto?.nome ?? 'Produto' }}
                </span>
                <div class="item-card__actions">
                  @if (podeEditar(item.status)) {
                    <button
                      class="item-action item-action--edit"
                      (click)="abrirEdicao(item)"
                      aria-label="Editar item"
                    >
                      <lucide-icon name="pencil" [size]="15" />
                    </button>
                  }
                  @if (podeCancelar(item.status)) {
                    <button
                      class="item-action item-action--cancel"
                      (click)="pedirCancelamento(item)"
                      aria-label="Cancelar item"
                    >
                      <lucide-icon name="x" [size]="15" />
                    </button>
                  }
                  <app-status-badge [status]="item.status" />
                </div>
              </div>
              @if (item.observacao) {
                <p class="item-card__obs">
                  <lucide-icon name="message-square" [size]="12" />
                  {{ item.observacao }}
                </p>
              }
              <div class="item-card__bottom">
                <span class="item-card__qtd">{{ item.quantidade }}x</span>
                <span class="item-card__total">{{ item.total | currencyBr }}</span>
              </div>
            </div>
          }

          <!-- Itens cancelados -->
          @if (itensCancelados().length > 0) {
            <div class="cancelados-label">
              <lucide-icon name="x-circle" [size]="13" />
              Cancelados
            </div>
            @for (item of itensCancelados(); track item.id) {
              <div class="item-card item-card--cancelado">
                <div class="item-card__top">
                  <span class="item-card__nome">{{ item.produto?.nome ?? 'Produto' }}</span>
                  <app-status-badge [status]="item.status" />
                </div>
                <div class="item-card__bottom">
                  <span class="item-card__qtd">{{ item.quantidade }}x</span>
                  <span class="item-card__total item-card__total--riscado">
                    {{ item.total | currencyBr }}
                  </span>
                </div>
              </div>
            }
          }
        }
      </main>

      <!-- FAB -->
      @if (!comanda.isLoading() && comanda.hasValue() && comanda.value().aberta) {
        <div class="fab-area">
          @if (podeFechar()) {
            <button class="b-btn-ghost fab-fechar" (click)="pedirFechamento()">
              <lucide-icon name="lock" [size]="18" />
              Fechar comanda
            </button>
          }
          <button class="b-btn-primary fab" (click)="abrirPicker()">
            <lucide-icon name="plus" [size]="20" />
            Adicionar item
          </button>
        </div>
      }
    </div>

    <!-- ===== CONFIRM DIALOG: FECHAR COMANDA COM ITENS PENDENTES ===== -->
    @if (pedindoFechar()) {
      <app-confirm-dialog
        title="Fechar com itens pendentes?"
        [message]="'Há ' + qtdBloqueantes() + ' item(ns) ainda em preparo. Deseja fechar a comanda mesmo assim?'"
        confirmLabel="Sim, fechar mesmo assim"
        cancelLabel="Cancelar"
        [confirmDanger]="true"
        (confirmed)="confirmarFechamentoForcado()"
        (cancelled)="pedindoFechar.set(false)"
      />
    }

    <!-- ===== CONFIRM DIALOG: CANCELAR ITEM ===== -->
    @if (itemParaCancelar()) {
      <app-confirm-dialog
        title="Cancelar item?"
        [message]="'Deseja cancelar ' + (itemParaCancelar()!.produto?.nome ?? 'este item') + '? Esta ação não pode ser desfeita.'"
        confirmLabel="Sim, cancelar"
        cancelLabel="Voltar"
        [confirmDanger]="true"
        (confirmed)="confirmarCancelamento()"
        (cancelled)="recusarCancelamento()"
      />
    }

    <!-- ===== SHEET: EDITAR ITEM ===== -->
    @if (uiStep() === 'edicao' && itemEmEdicao(); as item) {
      <app-formulario-item
        [titulo]="item.produto?.nome ?? 'Editar item'"
        [preco]="item.produto?.preco ?? 0"
        [valorInicial]="{ quantidade: item.quantidade, observacao: item.observacao ?? '' }"
        [salvando]="salvando()"
        textoConfirmar="Salvar alterações"
        (confirmado)="confirmarEdicao($event)"
        (cancelado)="fecharEdicao()"
      />
    }

    <!-- ===== SHEET: PICKER DE PRODUTOS ===== -->
    @if (uiStep() === 'picker') {
      <app-seletor-produto
        [cardapio]="cardapio.hasValue() ? cardapio.value() : undefined"
        [carregando]="cardapio.isLoading()"
        (produtoEscolhido)="selecionarProduto($event)"
        (fechado)="fecharPicker()"
      />
    }

    <!-- ===== SHEET: ADICIONAR ITEM ===== -->
    @if (uiStep() === 'form' && produtoSelecionado(); as produto) {
      <app-formulario-item
        [titulo]="produto.nome"
        [preco]="produto.preco"
        [mostrarVoltar]="true"
        [salvando]="adicionando()"
        textoConfirmar="Confirmar pedido"
        (confirmado)="confirmarAdicao($event)"
        (cancelado)="fecharPicker()"
        (voltar)="voltarParaPicker()"
      />
    }
  `,
  styles: [`
    /* ===== LAYOUT ===== */
    .layout {
      display: flex;
      flex-direction: column;
      min-height: 100dvh;
      background-color: var(--b-bg);
      font-family: var(--b-font-sans);
      padding-bottom: 140px;
    }

    /* ===== HEADER ===== */
    .header {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
      padding: var(--b-space-3) var(--b-space-4);
      background-color: var(--b-bg-elevated);
      border-bottom: 1px solid var(--b-neutral-100);
      box-shadow: var(--b-shadow-1);
      min-height: 64px;
    }

    .header__info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .header__title {
      font-size: var(--b-font-size-lg);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg);
      margin: 0;
      font-family: monospace;
      line-height: var(--b-line-height-tight);
    }

    .header__sub {
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-muted);
    }

    .header__total {
      font-size: var(--b-font-size-xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-primary-600);
      flex-shrink: 0;
    }

    /* ===== CONTENT ===== */
    .content {
      flex: 1;
      padding: var(--b-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--b-space-3);
    }

    /* ===== ITEM CARD ===== */
    .item-card {
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-md);
      border: 1px solid var(--b-neutral-100);
      box-shadow: var(--b-shadow-1);
      padding: var(--b-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--b-space-2);

      &--cancelado {
        opacity: 0.55;
        background-color: var(--b-bg-sunken);
      }

      &--skeleton {
        gap: var(--b-space-3);
      }
    }

    .item-card__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--b-space-2);
    }

    .item-card__nome {
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg);
      flex: 1;
    }

    .item-card__obs {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-muted);
      font-style: italic;
      margin: 0;
    }

    .item-card__actions {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      flex-shrink: 0;
    }

    .item-action {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      min-height: 32px;
      border-radius: var(--b-radius-sm);
      border: 1px solid transparent;
      background-color: transparent;

      &--edit {
        color: var(--b-fg-muted);
        border-color: var(--b-neutral-200);

        &:hover {
          background-color: var(--b-bg-sunken);
          color: var(--b-fg);
        }
      }

      &--cancel {
        color: var(--b-danger-500);
        border-color: var(--b-danger-100);

        &:hover {
          background-color: var(--b-danger-50);
          border-color: var(--b-danger-300);
        }
      }
    }

    .item-card__bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .item-card__qtd {
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg-muted);
    }

    .item-card__total {
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg);

      &--riscado {
        text-decoration: line-through;
        color: var(--b-fg-subtle);
      }
    }

    .cancelados-label {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg-subtle);
      padding: var(--b-space-1) 0;
      margin-top: var(--b-space-2);
    }

    /* ===== FAB ===== */
    .fab-area {
      position: fixed;
      bottom: var(--b-space-5);
      left: var(--b-space-4);
      right: var(--b-space-4);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--b-space-2);
    }

    .fab {
      width: 100%;
      max-width: 400px;
      min-height: 52px;
      box-shadow: var(--b-shadow-3);
    }

    .fab-fechar {
      width: 100%;
      max-width: 400px;
      min-height: 44px;
      border: 1px solid var(--b-neutral-300);
    }

  `],
})
export class ComandaDetalheComponent implements OnInit, OnDestroy {
  private readonly garcomService = inject(GarcomService);
  private readonly socketService = inject(SocketService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);

  private readonly comandaId = this.route.snapshot.params['id'] as string;
  private subs: Subscription[] = [];

  protected readonly skeletonItems = Array.from({ length: 3 }, (_, i) => i);

  // UI state — add flow
  protected readonly uiStep = signal<UiStep>('lista');
  protected readonly produtoSelecionado = signal<Produto | null>(null);
  protected readonly adicionando = signal(false);

  // UI state — edit/cancel flow
  protected readonly itemEmEdicao = signal<ItemComanda | null>(null);
  protected readonly itemParaCancelar = signal<ItemComanda | null>(null);
  protected readonly salvando = signal(false);
  protected readonly cancelando = signal(false);

  // UI state — fechar comanda
  protected readonly pedindoFechar = signal(false);
  protected readonly qtdBloqueantes = signal(0);
  protected readonly fechando = signal(false);
  protected readonly podeFechar = computed(() => ['admin', 'caixa'].includes(userPerfil() ?? ''));

  // Data
  protected readonly comanda = resource({
    loader: () => this.garcomService.buscarComanda(this.comandaId),
  });

  protected readonly cardapio = resource({
    loader: () =>
      Promise.all([
        this.garcomService.listarCategorias(),
        this.garcomService.listarProdutosDisponiveis(),
      ]).then(([categorias, produtos]) => ({ categorias, produtos })),
  });

  // Computed
  protected readonly itensAtivos = computed(
    () => (this.comanda.hasValue() ? this.comanda.value().itens : []).filter(i => i.status !== 'cancelado')
  );

  protected readonly itensCancelados = computed(
    () => (this.comanda.hasValue() ? this.comanda.value().itens : []).filter(i => i.status === 'cancelado')
  );

  protected readonly totalAtivo = computed(
    () => this.itensAtivos().reduce((sum, i) => sum + i.total, 0)
  );

  constructor() {
    // Se a comanda falhar ao (re)carregar com algum sheet/dialog aberto, os
    // dados que a UI mostra podem já não existir mais no servidor — fecha
    // tudo em vez de deixar o usuário editar/cancelar contra estado morto.
    effect(() => {
      if (this.comanda.error()) {
        this.resetarUiState();
      }
    });
  }

  private resetarUiState(): void {
    this.uiStep.set('lista');
    this.produtoSelecionado.set(null);
    this.itemEmEdicao.set(null);
    this.itemParaCancelar.set(null);
    this.pedindoFechar.set(false);
  }

  // Update otimista: muta o item localmente em vez de refazer o GET da
  // comanda inteira. O WebSocket (item:atualizado/item:cancelado) ainda
  // dispara comanda.reload() em paralelo — serve de confirmação/correção
  // caso o estado do servidor divirja do que aplicamos aqui.
  private atualizarItemLocal(itemId: string, atualizar: (item: ItemComanda) => ItemComanda): void {
    if (!this.comanda.hasValue()) {
      this.comanda.reload();
      return;
    }
    this.comanda.update(c => ({
      ...c,
      itens: c.itens.map(i => (i.id === itemId ? atualizar(i) : i)),
    }));
  }

  ngOnInit(): void {
    this.subs.push(
      this.socketService.on<ItemComanda>('item:novo').subscribe(item => {
        if (this.comanda.hasValue() && this.comanda.value().id === item.id) return;
        this.comanda.reload();
      }),
      this.socketService.on<unknown>('item:atualizado').subscribe(() => {
        this.comanda.reload();
      }),
      this.socketService.on<unknown>('item:cancelado').subscribe(() => {
        this.comanda.reload();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  protected voltar(): void {
    const mesaId = this.comanda.hasValue() ? this.comanda.value().mesaId : undefined;
    if (mesaId) {
      this.router.navigate(['/garcom/mesa', mesaId, 'comandas']);
    } else {
      this.router.navigate(['/garcom/mesas']);
    }
  }

  // ===== Picker =====

  protected abrirPicker(): void {
    this.uiStep.set('picker');
    if (!this.cardapio.hasValue()) this.cardapio.reload();
  }

  protected fecharPicker(): void {
    this.uiStep.set('lista');
    this.produtoSelecionado.set(null);
  }

  protected voltarParaPicker(): void {
    this.produtoSelecionado.set(null);
    this.uiStep.set('picker');
  }

  protected selecionarProduto(produto: Produto): void {
    this.produtoSelecionado.set(produto);
    this.uiStep.set('form');
  }

  // ===== Helpers de permissão =====

  protected podeEditar(status: StatusItem): boolean {
    return EDITAVEL.includes(status);
  }

  protected podeCancelar(status: StatusItem): boolean {
    return CANCELAVEL.includes(status);
  }

  // ===== Edição =====

  protected abrirEdicao(item: ItemComanda): void {
    this.itemEmEdicao.set(item);
    this.uiStep.set('edicao');
  }

  protected fecharEdicao(): void {
    this.uiStep.set('lista');
    this.itemEmEdicao.set(null);
  }

  protected async confirmarEdicao(payload: ConfirmacaoItem): Promise<void> {
    const item = this.itemEmEdicao();
    if (!item || this.salvando()) return;

    // O item pode ter mudado de status (ou sumido) via WS enquanto o sheet
    // de edição estava aberto — reconfere contra o estado atual antes de
    // mandar pro servidor, em vez de editar contra dado morto.
    const atual = this.comanda.hasValue()
      ? this.comanda.value().itens.find(i => i.id === item.id)
      : undefined;
    if (!atual || !this.podeEditar(atual.status)) {
      this.toast.danger('Este item não pode mais ser editado.');
      this.fecharEdicao();
      return;
    }

    this.salvando.set(true);
    try {
      const itemAtualizado = await this.garcomService.editarItem(this.comandaId, item.id, {
        quantidade: payload.quantidade,
        observacao: payload.observacao,
      });
      this.toast.success('Item atualizado!');
      this.fecharEdicao();
      this.atualizarItemLocal(item.id, () => itemAtualizado);
    } catch {
      this.toast.danger('Não foi possível editar o item. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  // ===== Cancelamento =====

  protected pedirCancelamento(item: ItemComanda): void {
    this.itemParaCancelar.set(item);
  }

  protected recusarCancelamento(): void {
    this.itemParaCancelar.set(null);
  }

  protected async confirmarCancelamento(): Promise<void> {
    const item = this.itemParaCancelar();
    if (!item || this.cancelando()) return;

    this.itemParaCancelar.set(null);

    const atual = this.comanda.hasValue()
      ? this.comanda.value().itens.find(i => i.id === item.id)
      : undefined;
    if (!atual || !this.podeCancelar(atual.status)) {
      this.toast.danger('Este item não pode mais ser cancelado.');
      return;
    }

    this.cancelando.set(true);
    try {
      await this.garcomService.cancelarItem(this.comandaId, item.id);
      this.toast.success(`${item.produto?.nome ?? 'Item'} cancelado.`);
      this.atualizarItemLocal(item.id, (i) => ({ ...i, status: 'cancelado' }));
    } catch {
      this.toast.danger('Não foi possível cancelar o item. Tente novamente.');
    } finally {
      this.cancelando.set(false);
    }
  }

  // ===== Fechar comanda =====

  protected pedirFechamento(): void {
    const itens = this.comanda.hasValue() ? this.comanda.value().itens : [];
    const bloqueantes = itens.filter(
      (i) => i.status === 'pendente' || i.status === 'em_preparo'
    );
    if (bloqueantes.length > 0) {
      this.qtdBloqueantes.set(bloqueantes.length);
      this.pedindoFechar.set(true);
    } else {
      void this.executarFechamento(false);
    }
  }

  protected confirmarFechamentoForcado(): void {
    this.pedindoFechar.set(false);
    void this.executarFechamento(true);
  }

  private async executarFechamento(ignorarPendentes: boolean): Promise<void> {
    if (this.fechando()) return;
    this.fechando.set(true);
    try {
      await this.garcomService.fecharComanda(this.comandaId, ignorarPendentes);
      this.toast.success('Comanda fechada com sucesso!');
      this.voltar();
    } catch {
      this.toast.danger('Não foi possível fechar a comanda.');
    } finally {
      this.fechando.set(false);
    }
  }

  protected async confirmarAdicao(payload: ConfirmacaoItem): Promise<void> {
    const produto = this.produtoSelecionado();
    if (!produto || this.adicionando()) return;

    this.adicionando.set(true);
    try {
      const novoItem = await this.garcomService.adicionarItem(this.comandaId, {
        produtoId: produto.id,
        quantidade: payload.quantidade,
        observacao: payload.observacao,
      });
      this.toast.success(`${produto.nome} adicionado!`);
      this.fecharPicker();
      if (this.comanda.hasValue()) {
        this.comanda.update(c => ({ ...c, itens: [...c.itens, novoItem] }));
      } else {
        this.comanda.reload();
      }
    } catch {
      this.toast.danger('Não foi possível adicionar o item. Tente novamente.');
    } finally {
      this.adicionando.set(false);
    }
  }

}
