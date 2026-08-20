import { Component, inject, signal, resource, effect } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { form, FormField, submit, required, min } from '@angular/forms/signals';
import { FluxoCaixaService, FiltrosFluxoCaixa } from './fluxo-caixa.service';
import { AdminService } from '../../admin/admin.service';
import { userPerfil } from '../../../core/auth/auth.signal';
import { MovimentacaoFinanceira, TipoMovimentacao } from '../../../shared/types';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ConnectionBannerComponent } from '../../../shared/components/connection-banner/connection-banner.component';
import { CurrencyBrPipe } from '../../../shared/pipes/currency-br.pipe';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-fluxo-caixa-lista',
  standalone: true,
  imports: [
    FormField,
    SkeletonComponent,
    ConnectionBannerComponent,
    CurrencyBrPipe,
    LucideAngularModule,
  ],
  template: `
    <div class="layout">
      <app-connection-banner />

      <header class="header">
        <button class="b-btn-back" (click)="router.navigateByUrl('/caixa/comandas')" aria-label="Voltar">
          <lucide-icon name="arrow-left" [size]="20" />
        </button>
        <div class="header__info">
          <h1 class="header__title">
            <lucide-icon name="wallet" [size]="22" color="var(--b-primary-500)" />
            Fluxo de caixa
          </h1>
        </div>
        <div class="header__actions">
          <button class="b-btn-secondary" (click)="abrirFormulario('entrada')">
            <lucide-icon name="circle-plus" [size]="16" />
            Entrada
          </button>
          <button class="b-btn-secondary" (click)="abrirFormulario('saida')">
            <lucide-icon name="circle-minus" [size]="16" />
            Saída
          </button>
        </div>
      </header>

      <main class="content">
        <!-- Resumo -->
        <div class="kpi-grid">
          @if (resumo.isLoading()) {
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="kpi-card">
                <app-skeleton height="0.875rem" width="100px" />
                <app-skeleton height="1.75rem" width="90px" />
              </div>
            }
          } @else if (resumo.hasValue()) {
            <div class="kpi-card">
              <span class="kpi-card__label">Saldo atual</span>
              <span class="kpi-card__valor kpi-card__valor--primary">
                {{ resumo.value()!.saldoAtual | currencyBr }}
              </span>
            </div>
            <div class="kpi-card">
              <span class="kpi-card__label">Saldo inicial</span>
              <span class="kpi-card__valor">{{ resumo.value()!.saldoInicial | currencyBr }}</span>
            </div>
            <div class="kpi-card">
              <span class="kpi-card__label">Entradas</span>
              <span class="kpi-card__valor kpi-card__valor--success">
                {{ resumo.value()!.totalEntradas | currencyBr }}
              </span>
            </div>
            <div class="kpi-card">
              <span class="kpi-card__label">Saídas</span>
              <span class="kpi-card__valor kpi-card__valor--danger">
                {{ resumo.value()!.totalSaidas | currencyBr }}
              </span>
            </div>
          }
        </div>

        <!-- Filtros -->
        <div class="filtros-bar">
          <input class="b-input" type="date" (change)="onFiltroImediato('dataInicial', $event)" aria-label="Data inicial" />
          <input class="b-input" type="date" (change)="onFiltroImediato('dataFinal', $event)" aria-label="Data final" />
          <select class="b-input" (change)="onFiltroImediato('tipo', $event)" aria-label="Tipo">
            <option value="">Tipo</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
          <select class="b-input" (change)="onFiltroImediato('origem', $event)" aria-label="Origem">
            <option value="">Origem</option>
            <option value="manual">Manual</option>
            <option value="automatica">Automática</option>
          </select>
          <input class="b-input" type="text" placeholder="Categoria" (input)="onFiltroTexto('categoria', $event)" />
          <input class="b-input" type="text" placeholder="Forma de pagamento" (input)="onFiltroTexto('formaPagamento', $event)" />
          <select class="b-input" (change)="onFiltroImediato('usuarioId', $event)" aria-label="Usuário">
            <option value="">Usuário</option>
            @for (u of usuarios.value() ?? []; track u.id) {
              <option [value]="u.id">{{ u.nome }}</option>
            }
          </select>
        </div>

        <!-- Listagem -->
        @if (movimentacoes.isLoading()) {
          @for (i of [1, 2, 3, 4, 5]; track i) {
            <div class="mov-row mov-row--skeleton">
              <app-skeleton height="1rem" width="40%" />
              <app-skeleton height="1rem" width="20%" />
              <app-skeleton height="1rem" width="15%" />
            </div>
          }
        } @else if (movimentacoes.error()) {
          <div class="empty-state">
            <lucide-icon name="wifi-off" [size]="40" color="var(--b-fg-subtle)" />
            <p>Erro ao carregar movimentações</p>
            <button class="b-btn-secondary" (click)="movimentacoes.reload()">Tentar novamente</button>
          </div>
        } @else if ((movimentacoes.value() ?? []).length === 0) {
          <div class="empty-state">
            <lucide-icon name="inbox" [size]="40" color="var(--b-fg-subtle)" />
            <p>Nenhuma movimentação encontrada</p>
          </div>
        } @else {
          @for (mov of movimentacoes.value(); track mov.id) {
            <button class="mov-row" (click)="abrirDetalhe(mov)">
              <div class="mov-row__info">
                <span class="mov-row__categoria">{{ mov.categoria }}</span>
                <span class="mov-row__meta">
                  {{ formatarData(mov.ocorridaEm) }} · {{ mov.origem === 'automatica' ? 'Automática' : 'Manual' }}
                  @if (mov.status === 'estornada') {
                    · <span class="mov-row__estornada">estornada</span>
                  }
                </span>
              </div>
              <span class="mov-row__valor" [class.mov-row__valor--saida]="mov.tipo === 'saida'">
                {{ mov.tipo === 'saida' ? '-' : '+' }}{{ mov.valor | currencyBr }}
              </span>
            </button>
          }
        }
      </main>
    </div>

    <!-- Modal: nova movimentação -->
    @if (mostrandoFormulario()) {
      <div class="backdrop" (click)="fecharFormulario()"></div>
      <div class="modal" role="dialog" aria-modal="true">
        <h2 class="modal__title">
          {{ mostrandoFormulario() === 'entrada' ? 'Nova entrada' : 'Nova saída' }}
        </h2>

        <form (submit)="onSubmitMovimentacao(); $event.preventDefault()">
          <label class="b-label">
            Valor
            <input class="b-input" type="number" step="0.01" [formField]="novaMovimentacaoForm.valor" />
            @if (novaMovimentacaoForm.valor().touched() && novaMovimentacaoForm.valor().errors().length) {
              <span class="b-error-message">{{ novaMovimentacaoForm.valor().errors()[0].message }}</span>
            }
          </label>

          <label class="b-label">
            Categoria
            <input class="b-input" type="text" [formField]="novaMovimentacaoForm.categoria" />
            @if (novaMovimentacaoForm.categoria().touched() && novaMovimentacaoForm.categoria().errors().length) {
              <span class="b-error-message">{{ novaMovimentacaoForm.categoria().errors()[0].message }}</span>
            }
          </label>

          <label class="b-label">
            Descrição
            <input class="b-input" type="text" [formField]="novaMovimentacaoForm.descricao" />
            @if (novaMovimentacaoForm.descricao().touched() && novaMovimentacaoForm.descricao().errors().length) {
              <span class="b-error-message">{{ novaMovimentacaoForm.descricao().errors()[0].message }}</span>
            }
          </label>

          <label class="b-label">
            Forma de pagamento (opcional)
            <input class="b-input" type="text" [formField]="novaMovimentacaoForm.formaPagamento" />
          </label>

          <div class="modal__actions">
            <button type="button" class="b-btn-secondary" (click)="fecharFormulario()">Cancelar</button>
            <button type="submit" class="b-btn-primary" [disabled]="novaMovimentacaoForm().invalid() || salvando()">
              @if (salvando()) {
                <lucide-icon name="loader-2" [size]="16" class="b-spin" />
              }
              Confirmar
            </button>
          </div>
        </form>
      </div>
    }
  `,
  styles: [`
    .layout { display: flex; flex-direction: column; min-height: 100dvh; background-color: var(--b-bg); font-family: var(--b-font-sans); }

    .header { display: flex; align-items: center; gap: var(--b-space-3); padding: var(--b-space-4) var(--b-space-6); background-color: var(--b-bg-elevated); border-bottom: 1px solid var(--b-neutral-100); box-shadow: var(--b-shadow-1); }
    .header__info { flex: 1; }
    .header__title { display: flex; align-items: center; gap: var(--b-space-2); font-size: var(--b-font-size-xl); font-weight: var(--b-font-weight-extrabold); color: var(--b-fg); margin: 0; }
    .header__actions { display: flex; gap: var(--b-space-2); }

    .content { flex: 1; padding: var(--b-space-4); display: flex; flex-direction: column; gap: var(--b-space-4); }
    @media (min-width: 768px) { .content { padding: var(--b-space-6); } }

    .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--b-space-3); }
    @media (min-width: 768px) { .kpi-grid { grid-template-columns: repeat(4, 1fr); } }
    .kpi-card { display: flex; flex-direction: column; gap: var(--b-space-1); padding: var(--b-space-4); background-color: var(--b-bg-elevated); border-radius: var(--b-radius-md); border: 1px solid var(--b-neutral-200); box-shadow: var(--b-shadow-1); }
    .kpi-card__label { font-size: var(--b-font-size-sm); color: var(--b-fg-muted); }
    .kpi-card__valor { font-size: var(--b-font-size-xl); font-weight: var(--b-font-weight-extrabold); color: var(--b-fg); }
    .kpi-card__valor--primary { color: var(--b-primary-600); }
    .kpi-card__valor--success { color: var(--b-success-600); }
    .kpi-card__valor--danger { color: var(--b-danger-600); }

    .filtros-bar { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--b-space-2); }
    @media (min-width: 1024px) { .filtros-bar { grid-template-columns: repeat(7, 1fr); } }

    .mov-row { display: flex; align-items: center; justify-content: space-between; gap: var(--b-space-3); padding: var(--b-space-3) var(--b-space-4); background-color: var(--b-bg-elevated); border-radius: var(--b-radius-sm); border: 1px solid var(--b-neutral-200); cursor: pointer; text-align: left; font-family: var(--b-font-sans); width: 100%; min-height: 44px; }
    .mov-row--skeleton { cursor: default; flex-direction: column; align-items: flex-start; gap: var(--b-space-2); }
    .mov-row__info { display: flex; flex-direction: column; gap: 2px; }
    .mov-row__categoria { font-weight: var(--b-font-weight-semibold); color: var(--b-fg); }
    .mov-row__meta { font-size: var(--b-font-size-xs); color: var(--b-fg-muted); }
    .mov-row__estornada { color: var(--b-danger-600); font-weight: var(--b-font-weight-semibold); }
    .mov-row__valor { font-weight: var(--b-font-weight-bold); color: var(--b-success-600); white-space: nowrap; }
    .mov-row__valor--saida { color: var(--b-danger-600); }

    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--b-space-3); padding: var(--b-space-16) var(--b-space-4); text-align: center; color: var(--b-fg-muted); }

    .backdrop { position: fixed; inset: 0; background-color: rgba(44, 26, 14, 0.5); backdrop-filter: blur(2px); z-index: var(--b-z-modal); }
    .modal { position: fixed; inset: 0; margin: auto; z-index: var(--b-z-modal); background-color: var(--b-bg-elevated); border-radius: var(--b-radius-lg); box-shadow: var(--b-shadow-4); padding: var(--b-space-6); width: 100%; max-width: 420px; max-height: fit-content; display: flex; flex-direction: column; gap: var(--b-space-4); }
    .modal__title { font-size: var(--b-font-size-xl); font-weight: var(--b-font-weight-bold); color: var(--b-fg); margin: 0; }
    .modal form { display: flex; flex-direction: column; gap: var(--b-space-3); }
    .modal__actions { display: flex; justify-content: flex-end; gap: var(--b-space-3); margin-top: var(--b-space-2); }
  `],
})
export class FluxoCaixaListaComponent {
  protected readonly router = inject(Router);
  private readonly fluxoCaixaService = inject(FluxoCaixaService);
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  private debounceTimer?: ReturnType<typeof setTimeout>;

  protected readonly filtros = signal<FiltrosFluxoCaixa>({});
  protected readonly salvando = signal(false);
  protected readonly mostrandoFormulario = signal<TipoMovimentacao | null>(null);

  protected readonly resumo = resource({
    loader: () => this.fluxoCaixaService.obterResumo(this.filtros()),
  });

  protected readonly movimentacoes = resource({
    loader: () => this.fluxoCaixaService.listarMovimentacoes(this.filtros()),
  });

  // GET /usuarios é restrito a admin na API — perfil caixa não pode listar
  // usuários, então o dropdown fica sem opções pra ele em vez de quebrar.
  protected readonly usuarios = resource({
    loader: () => (userPerfil() === 'admin' ? this.adminService.listarUsuarios() : Promise.resolve([])),
  });

  protected readonly novaMovimentacaoModel = signal({
    valor: 0,
    categoria: '',
    descricao: '',
    formaPagamento: '',
  });

  protected readonly novaMovimentacaoForm = form(this.novaMovimentacaoModel, (s) => {
    required(s.valor, { message: 'Valor é obrigatório' });
    min(s.valor, 0.01, { message: 'Valor deve ser maior que zero' });
    required(s.categoria, { message: 'Categoria é obrigatória' });
    required(s.descricao, { message: 'Descrição é obrigatória' });
  });

  constructor() {
    effect(() => {
      this.filtros(); // rastreia mudanças
      this.resumo.reload();
      this.movimentacoes.reload();
    });
  }

  protected setFiltro<K extends keyof FiltrosFluxoCaixa>(campo: K, valor: string): void {
    this.filtros.update((f) => ({ ...f, [campo]: valor || undefined }));
  }

  protected onFiltroImediato(campo: keyof FiltrosFluxoCaixa, event: Event): void {
    this.setFiltro(campo, (event.target as HTMLInputElement | HTMLSelectElement).value);
  }

  protected onFiltroTexto(campo: 'categoria' | 'formaPagamento', event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.setFiltro(campo, valor), 400);
  }

  protected abrirFormulario(tipo: TipoMovimentacao): void {
    this.novaMovimentacaoModel.set({ valor: 0, categoria: '', descricao: '', formaPagamento: '' });
    this.mostrandoFormulario.set(tipo);
  }

  protected fecharFormulario(): void {
    this.mostrandoFormulario.set(null);
  }

  protected async onSubmitMovimentacao(): Promise<void> {
    const tipo = this.mostrandoFormulario();
    if (!tipo) return;

    await submit(this.novaMovimentacaoForm, async () => {
      this.salvando.set(true);
      const { valor, categoria, descricao, formaPagamento } = this.novaMovimentacaoModel();
      const payload = { valor, categoria, descricao, formaPagamento: formaPagamento || undefined };

      try {
        await (tipo === 'entrada'
          ? this.fluxoCaixaService.registrarEntrada(payload)
          : this.fluxoCaixaService.registrarSaida(payload));
        this.toast.success('Movimentação registrada.');
        this.fecharFormulario();
        this.resumo.reload();
        this.movimentacoes.reload();
      } catch (err) {
        if (err instanceof HttpErrorResponse && err.status === 400) {
          this.toast.danger(err.error?.error?.message ?? 'Dados inválidos.');
        } else {
          this.toast.danger('Não foi possível registrar a movimentação. Tente novamente.');
        }
      } finally {
        this.salvando.set(false);
      }
    });
  }

  protected abrirDetalhe(mov: MovimentacaoFinanceira): void {
    this.router.navigate(['/caixa/fluxo-caixa', mov.id]);
  }

  protected formatarData(data: string): string {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
