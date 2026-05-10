import {
  Component,
  inject,
  signal,
  computed,
  resource,
} from '@angular/core';
import { Router } from '@angular/router';
import { AdminService, CriarMesaPayload } from '../admin.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { Mesa } from '../../../shared/types';
import { LucideAngularModule } from 'lucide-angular';

interface MesaModel {
  numero: string;
  descricao: string;
}

const MODELO_VAZIO: MesaModel = { numero: '', descricao: '' };

type Campo = keyof MesaModel;

const STATUS_LABEL: Record<Mesa['status'], string> = {
  livre: 'livre',
  ocupada: 'ocupada',
  item_pronto: 'item pronto',
};

@Component({
  selector: 'app-admin-mesas',
  standalone: true,
  imports: [SkeletonComponent, ConfirmDialogComponent, LucideAngularModule],
  template: `
    <div class="layout">
      <!-- Topbar -->
      <header class="topbar">
        <button class="b-btn-back" (click)="router.navigateByUrl('/admin/dashboard')" aria-label="Voltar">
          <lucide-icon name="arrow-left" [size]="18" />
        </button>
        <h1 class="topbar__title">Mesas</h1>
        <button class="b-btn-primary btn-novo" (click)="abrirCriar()">
          <lucide-icon name="plus" [size]="16" />
          Nova mesa
        </button>
      </header>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="search-box">
          <lucide-icon name="search" [size]="15" color="var(--b-fg-subtle)" />
          <input class="search-input" type="search" placeholder="Buscar por número ou descrição..."
            [value]="busca()" (input)="busca.set($any($event.target).value)" autocomplete="off" />
          @if (busca()) {
            <button class="search-clear" (click)="busca.set('')" aria-label="Limpar">
              <lucide-icon name="x" [size]="13" />
            </button>
          }
        </div>
        <div class="filtro-tabs">
          <button class="filtro-tab" [class.filtro-tab--active]="filtroStatus() === null" (click)="filtroStatus.set(null)">Todas</button>
          <button class="filtro-tab" [class.filtro-tab--active]="filtroStatus() === 'livre'" (click)="filtroStatus.set('livre')">Livres</button>
          <button class="filtro-tab" [class.filtro-tab--active]="filtroStatus() === 'ocupada'" (click)="filtroStatus.set('ocupada')">Ocupadas</button>
        </div>
        @if (!mesas.isLoading()) {
          <span class="toolbar__count">{{ mesasFiltradas().length }} mesa{{ mesasFiltradas().length !== 1 ? 's' : '' }}</span>
        }
      </div>

      <!-- Conteúdo -->
      <main class="content">
        @if (mesas.isLoading()) {
          <div class="grid">
            @for (i of skeletons; track i) {
              <div class="mesa-card-skeleton">
                <app-skeleton height="1.25rem" width="60px" />
                <app-skeleton height="0.875rem" width="80%" />
                <app-skeleton height="1.5rem" width="70px" />
              </div>
            }
          </div>
        } @else if (mesas.error()) {
          <div class="empty-state">
            <lucide-icon name="wifi-off" [size]="40" color="var(--b-fg-subtle)" />
            <p>Erro ao carregar mesas</p>
            <button class="b-btn-secondary" (click)="mesas.reload()">Tentar novamente</button>
          </div>
        } @else if (mesasFiltradas().length === 0) {
          <div class="empty-state">
            <lucide-icon name="layout-grid" [size]="48" color="var(--b-fg-subtle)" />
            <p class="empty-state__title">Nenhuma mesa encontrada</p>
            @if (!busca() && filtroStatus() === null) {
              <button class="b-btn-primary" (click)="abrirCriar()">
                <lucide-icon name="plus" [size]="16" />
                Criar primeira mesa
              </button>
            }
          </div>
        } @else {
          <div class="grid">
            @for (mesa of mesasFiltradas(); track mesa.id) {
              <div class="mesa-card" [class.mesa-card--ocupada]="mesa.status === 'ocupada'" [class.mesa-card--pronto]="mesa.status === 'item_pronto'">
                <div class="mesa-card__numero">Mesa {{ mesa.numero }}</div>
                @if (mesa.descricao) {
                  <div class="mesa-card__desc">{{ mesa.descricao }}</div>
                }
                <span class="status-pill status-pill--{{ mesa.status }}">{{ statusLabel(mesa.status) }}</span>
                <div class="mesa-card__acoes">
                  <button class="acao-btn acao-btn--edit" (click)="abrirEditar(mesa)" aria-label="Editar">
                    <lucide-icon name="pencil" [size]="14" />
                  </button>
                  <button class="acao-btn acao-btn--delete" (click)="pedirExclusao(mesa)" aria-label="Excluir"
                    [disabled]="mesa.status !== 'livre'">
                    <lucide-icon name="trash-2" [size]="14" />
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </main>
    </div>

    <!-- Painel lateral -->
    @if (painelAberto()) {
      <div class="painel-backdrop" (click)="fecharPainel()"></div>
      <aside class="painel" role="dialog" aria-modal="true">
        <div class="painel__header">
          <h2 class="painel__titulo">{{ editandoId() ? 'Editar mesa' : 'Nova mesa' }}</h2>
          <button class="painel__fechar" (click)="fecharPainel()" aria-label="Fechar">
            <lucide-icon name="x" [size]="20" />
          </button>
        </div>

        <div class="painel__form">
          <!-- Número -->
          <div class="campo">
            <label class="b-label" for="f-numero">Número da mesa <span class="obrigatorio">*</span></label>
            <input id="f-numero" class="b-input" type="number" min="1"
              [value]="model().numero"
              (input)="setField('numero', $any($event.target).value)"
              (blur)="tocou('numero')"
              placeholder="1" />
            @if (erroVisivel('numero')) {
              <span class="b-error-message">{{ erroVisivel('numero') }}</span>
            }
          </div>

          <!-- Descrição -->
          <div class="campo">
            <label class="b-label" for="f-desc">Descrição (opcional)</label>
            <input id="f-desc" class="b-input" type="text"
              [value]="model().descricao"
              (input)="setField('descricao', $any($event.target).value)"
              placeholder="Ex: Varanda, Térreo, Salão..." />
          </div>

          <!-- Ações -->
          <div class="painel__acoes">
            <button type="button" class="b-btn-secondary" (click)="fecharPainel()">Cancelar</button>
            <button type="button" class="b-btn-primary" [disabled]="salvando()" (click)="salvar()">
              @if (salvando()) {
                <lucide-icon name="loader-2" [size]="16" class="b-spin" />
                Salvando...
              } @else {
                <lucide-icon name="check" [size]="16" />
                {{ editandoId() ? 'Salvar' : 'Criar mesa' }}
              }
            </button>
          </div>
        </div>
      </aside>
    }

    @if (mesaParaExcluir()) {
      <app-confirm-dialog
        title="Excluir mesa?"
        [message]="mensagemExclusao()"
        confirmLabel="Excluir" cancelLabel="Cancelar" [confirmDanger]="true"
        (confirmed)="confirmarExclusao()" (cancelled)="mesaParaExcluir.set(null)" />
    }
  `,
  styles: [`
    .layout { display: flex; flex-direction: column; min-height: 100dvh; background-color: var(--b-bg); font-family: var(--b-font-sans); }

    .topbar { display: flex; align-items: center; gap: var(--b-space-3); padding: var(--b-space-4) var(--b-space-6); background-color: var(--b-bg-elevated); border-bottom: 1px solid var(--b-neutral-100); box-shadow: var(--b-shadow-1); }
    .topbar__title { flex: 1; font-size: var(--b-font-size-2xl); font-weight: var(--b-font-weight-extrabold); color: var(--b-fg); margin: 0; }
    .btn-novo { display: flex; align-items: center; gap: var(--b-space-2); min-height: 44px; white-space: nowrap; }

    .toolbar { display: flex; align-items: center; gap: var(--b-space-3); flex-wrap: wrap; padding: var(--b-space-3) var(--b-space-6); background-color: var(--b-bg-elevated); border-bottom: 1px solid var(--b-neutral-100); }
    .search-box { display: flex; align-items: center; gap: var(--b-space-2); padding: var(--b-space-2) var(--b-space-3); background-color: var(--b-bg-sunken); border: 1px solid var(--b-neutral-200); border-radius: var(--b-radius-sm); width: 280px; max-width: 100%; }
    .search-input { flex: 1; border: none; background: transparent; font-size: var(--b-font-size-sm); color: var(--b-fg); outline: none; font-family: var(--b-font-sans); &::placeholder { color: var(--b-fg-subtle); } }
    .search-clear { display: flex; align-items: center; border: none; background: transparent; color: var(--b-fg-muted); cursor: pointer; padding: 2px; &:hover { color: var(--b-fg); } }
    .filtro-tabs { display: flex; gap: var(--b-space-1); }
    .filtro-tab { padding: var(--b-space-1) var(--b-space-3); border-radius: var(--b-radius-sm); border: 1px solid var(--b-neutral-200); background: transparent; font-size: var(--b-font-size-sm); font-weight: var(--b-font-weight-medium); color: var(--b-fg-muted); cursor: pointer; font-family: var(--b-font-sans); min-height: 36px; &:hover { background-color: var(--b-bg-sunken); } &--active { background-color: var(--b-primary-500); border-color: var(--b-primary-500); color: var(--b-fg-inverted); font-weight: var(--b-font-weight-semibold); } }
    .toolbar__count { margin-left: auto; font-size: var(--b-font-size-sm); color: var(--b-fg-muted); }

    .content { flex: 1; padding: var(--b-space-6); }
    @media (max-width: 767px) {
      .topbar { padding: var(--b-space-4) var(--b-space-4); }
      .toolbar { padding: var(--b-space-3) var(--b-space-4); }
      .search-box { width: 100%; }
      .content { padding: var(--b-space-4); }
    }

    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: var(--b-space-4); }

    .mesa-card { background-color: var(--b-bg-elevated); border-radius: var(--b-radius-md); border: 1px solid var(--b-neutral-100); box-shadow: var(--b-shadow-1); padding: var(--b-space-4); display: flex; flex-direction: column; gap: var(--b-space-2); transition: box-shadow 0.15s;
      &:hover { box-shadow: var(--b-shadow-2); }
      &--ocupada { border-color: var(--b-secondary-200); background-color: var(--b-secondary-50); }
      &--pronto { border-color: var(--b-success-300); background-color: var(--b-success-50); }
    }
    .mesa-card-skeleton { background-color: var(--b-bg-elevated); border-radius: var(--b-radius-md); border: 1px solid var(--b-neutral-100); padding: var(--b-space-4); display: flex; flex-direction: column; gap: var(--b-space-3); }
    .mesa-card__numero { font-size: var(--b-font-size-lg); font-weight: var(--b-font-weight-extrabold); color: var(--b-fg); }
    .mesa-card__desc { font-size: var(--b-font-size-xs); color: var(--b-fg-muted); }
    .mesa-card__acoes { display: flex; gap: var(--b-space-1); margin-top: var(--b-space-1); }

    .status-pill { display: inline-flex; align-items: center; padding: 2px var(--b-space-2); border-radius: var(--b-radius-sm); font-size: var(--b-font-size-xs); font-weight: var(--b-font-weight-semibold);
      &--livre { background: var(--b-neutral-100); color: var(--b-neutral-600); }
      &--ocupada { background: var(--b-secondary-100); color: var(--b-secondary-700); }
      &--item_pronto { background: var(--b-success-100); color: var(--b-success-700); }
    }

    .acao-btn { display: flex; align-items: center; justify-content: center; min-width: 32px; min-height: 32px; border-radius: var(--b-radius-sm); border: 1px solid transparent; background: transparent; cursor: pointer;
      &--edit { color: var(--b-fg-muted); &:hover { background: var(--b-bg-sunken); color: var(--b-fg); border-color: var(--b-neutral-200); } }
      &--delete { color: var(--b-danger-400); &:hover:not(:disabled) { background: var(--b-danger-50); border-color: var(--b-danger-200); color: var(--b-danger-600); } &:disabled { opacity: 0.3; cursor: not-allowed; } }
    }

    .empty-state { display: flex; flex-direction: column; align-items: center; gap: var(--b-space-3); padding: var(--b-space-16) var(--b-space-4); text-align: center; color: var(--b-fg-muted); font-size: var(--b-font-size-sm); }
    .empty-state__title { font-size: var(--b-font-size-lg); font-weight: var(--b-font-weight-semibold); color: var(--b-fg); margin: 0; }

    /* Painel */
    .painel-backdrop { position: fixed; inset: 0; background-color: rgba(44,26,14,0.4); backdrop-filter: blur(2px); z-index: 100; }
    .painel { position: fixed; top: 0; right: 0; bottom: 0; width: 100%; max-width: 420px; background-color: var(--b-bg-elevated); box-shadow: var(--b-shadow-4); z-index: 101; display: flex; flex-direction: column; overflow-y: auto; }
    .painel__header { display: flex; align-items: center; justify-content: space-between; padding: var(--b-space-5); border-bottom: 1px solid var(--b-neutral-100); flex-shrink: 0; }
    .painel__titulo { font-size: var(--b-font-size-xl); font-weight: var(--b-font-weight-bold); color: var(--b-fg); margin: 0; }
    .painel__fechar { display: flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; border-radius: var(--b-radius-sm); border: none; background: transparent; color: var(--b-fg-muted); cursor: pointer; &:hover { background-color: var(--b-bg-sunken); } }
    .painel__form { flex: 1; padding: var(--b-space-5); display: flex; flex-direction: column; gap: var(--b-space-4); }
    .campo { display: flex; flex-direction: column; gap: var(--b-space-2); }
    .obrigatorio { color: var(--b-danger-500); }
    .painel__acoes { display: flex; justify-content: flex-end; gap: var(--b-space-3); padding-top: var(--b-space-4); border-top: 1px solid var(--b-neutral-100); margin-top: auto;
      button { min-height: 44px; display: flex; align-items: center; gap: var(--b-space-2); &:disabled { opacity: 0.6; cursor: not-allowed; } }
    }

  `],
})
export class AdminMesasComponent {
  protected readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  protected readonly skeletons = Array.from({ length: 8 }, (_, i) => i);

  protected readonly busca = signal('');
  protected readonly filtroStatus = signal<Mesa['status'] | null>(null);

  protected readonly mesas = resource({
    loader: () => this.adminService.listarMesas(),
  });

  protected readonly mesasFiltradas = computed(() => {
    const lista = [...(this.mesas.value() ?? [])].sort((a, b) => a.numero - b.numero);
    const q = this.busca().toLowerCase().trim();
    const st = this.filtroStatus();
    return lista.filter(m =>
      (!q || String(m.numero).includes(q) || (m.descricao ?? '').toLowerCase().includes(q)) &&
      (st === null || m.status === st)
    );
  });

  protected statusLabel(status: Mesa['status']): string {
    return STATUS_LABEL[status];
  }

  // Form state
  protected readonly painelAberto = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly salvando = signal(false);
  protected readonly mesaParaExcluir = signal<Mesa | null>(null);

  protected readonly model = signal<MesaModel>({ ...MODELO_VAZIO });
  private readonly _tocados = signal<Set<Campo>>(new Set());

  protected readonly erros = computed(() => {
    const m = this.model();
    const e: Partial<Record<Campo, string>> = {};
    if (!m.numero || Number(m.numero) < 1) e.numero = 'Número da mesa deve ser maior que zero';
    return e;
  });

  protected readonly formValido = computed(() => Object.keys(this.erros()).length === 0);

  protected setField(campo: Campo, value: unknown): void {
    this.model.update(m => ({ ...m, [campo]: value }));
  }

  protected tocou(campo: Campo): void {
    this._tocados.update(s => new Set([...s, campo]));
  }

  protected erroVisivel(campo: Campo): string | null {
    if (!this._tocados().has(campo)) return null;
    return this.erros()[campo] ?? null;
  }

  private marcarTodosTocados(): void {
    this._tocados.set(new Set<Campo>(['numero', 'descricao']));
  }

  protected abrirCriar(): void {
    this.editandoId.set(null);
    this.model.set({ ...MODELO_VAZIO });
    this._tocados.set(new Set());
    this.painelAberto.set(true);
  }

  protected abrirEditar(mesa: Mesa): void {
    this.editandoId.set(mesa.id);
    this.model.set({ numero: String(mesa.numero), descricao: mesa.descricao ?? '' });
    this._tocados.set(new Set());
    this.painelAberto.set(true);
  }

  protected fecharPainel(): void {
    this.painelAberto.set(false);
    this.editandoId.set(null);
  }

  protected async salvar(): Promise<void> {
    this.marcarTodosTocados();
    if (!this.formValido() || this.salvando()) return;

    this.salvando.set(true);
    const m = this.model();
    const payload: CriarMesaPayload = {
      numero: Number(m.numero),
      descricao: m.descricao.trim() || undefined,
    };

    try {
      const id = this.editandoId();
      if (id) {
        await this.adminService.editarMesa(id, payload);
        this.toast.success('Mesa atualizada!');
      } else {
        await this.adminService.criarMesa(payload);
        this.toast.success('Mesa criada!');
      }
      this.fecharPainel();
      this.mesas.reload();
    } catch {
      this.toast.danger('Não foi possível salvar a mesa. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  protected pedirExclusao(mesa: Mesa): void {
    this.mesaParaExcluir.set(mesa);
  }

  protected mensagemExclusao(): string {
    const n = this.mesaParaExcluir()?.numero ?? '';
    return `Deseja excluir a Mesa ${n}? Esta ação não pode ser desfeita.`;
  }

  protected async confirmarExclusao(): Promise<void> {
    const mesa = this.mesaParaExcluir();
    if (!mesa) return;
    this.mesaParaExcluir.set(null);
    try {
      await this.adminService.excluirMesa(mesa.id);
      this.toast.success(`Mesa ${mesa.numero} excluída.`);
      this.mesas.reload();
    } catch {
      this.toast.danger('Não foi possível excluir a mesa.');
    }
  }

}
