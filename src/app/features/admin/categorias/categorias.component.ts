import {
  Component,
  inject,
  signal,
  computed,
  resource,
} from '@angular/core';
import { Router } from '@angular/router';
import { AdminService, CriarCategoriaPayload } from '../admin.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { Categoria } from '../../../shared/types';
import { LucideAngularModule } from 'lucide-angular';

interface CategoriaModel {
  nome: string;
  ordem: string;
}

const MODELO_VAZIO: CategoriaModel = { nome: '', ordem: '' };

type Campo = keyof CategoriaModel;

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [SkeletonComponent, ConfirmDialogComponent, LucideAngularModule],
  template: `
    <div class="layout">
      <!-- Topbar -->
      <header class="topbar">
        <button class="b-btn-back" (click)="router.navigateByUrl('/admin/dashboard')" aria-label="Voltar">
          <lucide-icon name="arrow-left" [size]="18" />
        </button>
        <h1 class="topbar__title">Categorias</h1>
        <button class="b-btn-primary btn-novo" (click)="abrirCriar()">
          <lucide-icon name="plus" [size]="16" />
          Nova categoria
        </button>
      </header>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="search-box">
          <lucide-icon name="search" [size]="15" color="var(--b-fg-subtle)" />
          <input class="search-input" type="search" placeholder="Buscar por nome..."
            [value]="busca()" (input)="busca.set($any($event.target).value)" autocomplete="off" />
          @if (busca()) {
            <button class="search-clear" (click)="busca.set('')" aria-label="Limpar">
              <lucide-icon name="x" [size]="13" />
            </button>
          }
        </div>
        @if (!categorias.isLoading()) {
          <span class="toolbar__count">
            {{ categoriasFiltradas().length }} categoria{{ categoriasFiltradas().length !== 1 ? 's' : '' }}
          </span>
        }
      </div>

      <!-- Tabela -->
      <main class="content">
        @if (categorias.isLoading()) {
          <div class="table-wrap">
            <table class="tabela">
              <thead><tr><th>Ordem</th><th>Nome</th><th></th></tr></thead>
              <tbody>
                @for (i of skeletons; track i) {
                  <tr>
                    <td><app-skeleton height="1rem" width="40px" /></td>
                    <td><app-skeleton height="1rem" width="70%" /></td>
                    <td><app-skeleton height="1rem" width="60px" /></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else if (categorias.error()) {
          <div class="empty-state">
            <lucide-icon name="wifi-off" [size]="40" color="var(--b-fg-subtle)" />
            <p>Erro ao carregar categorias</p>
            <button class="b-btn-secondary" (click)="categorias.reload()">Tentar novamente</button>
          </div>
        } @else if (categoriasFiltradas().length === 0) {
          <div class="empty-state">
            <lucide-icon name="tag" [size]="48" color="var(--b-fg-subtle)" />
            <p class="empty-state__title">Nenhuma categoria encontrada</p>
            @if (!busca()) {
              <button class="b-btn-primary" (click)="abrirCriar()">
                <lucide-icon name="plus" [size]="16" />
                Criar primeira categoria
              </button>
            }
          </div>
        } @else {
          <div class="table-wrap">
            <table class="tabela">
              <thead>
                <tr><th class="th-ordem">Ordem</th><th>Nome</th><th></th></tr>
              </thead>
              <tbody>
                @for (cat of categoriasFiltradas(); track cat.id) {
                  <tr class="tabela__row">
                    <td class="tabela__ordem">
                      <span class="ordem-badge">{{ cat.ordem }}</span>
                    </td>
                    <td class="tabela__nome">{{ cat.nome }}</td>
                    <td class="tabela__acoes">
                      <button class="acao-btn acao-btn--edit" (click)="abrirEditar(cat)" aria-label="Editar">
                        <lucide-icon name="pencil" [size]="15" />
                      </button>
                      <button class="acao-btn acao-btn--delete" (click)="pedirExclusao(cat)" aria-label="Excluir">
                        <lucide-icon name="trash-2" [size]="15" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </main>
    </div>

    <!-- Painel lateral -->
    @if (painelAberto()) {
      <div class="painel-backdrop" (click)="fecharPainel()"></div>
      <aside class="painel" role="dialog" aria-modal="true">
        <div class="painel__header">
          <h2 class="painel__titulo">{{ editandoId() ? 'Editar categoria' : 'Nova categoria' }}</h2>
          <button class="painel__fechar" (click)="fecharPainel()" aria-label="Fechar">
            <lucide-icon name="x" [size]="20" />
          </button>
        </div>

        <div class="painel__form">
          <!-- Nome -->
          <div class="campo">
            <label class="b-label" for="f-nome">Nome <span class="obrigatorio">*</span></label>
            <input id="f-nome" class="b-input" type="text"
              [value]="model().nome"
              (input)="setField('nome', $any($event.target).value)"
              (blur)="tocou('nome')"
              placeholder="Ex: Pratos Principais" />
            @if (erroVisivel('nome')) {
              <span class="b-error-message">{{ erroVisivel('nome') }}</span>
            }
          </div>

          <!-- Ordem -->
          <div class="campo">
            <label class="b-label" for="f-ordem">Ordem de exibição <span class="obrigatorio">*</span></label>
            <input id="f-ordem" class="b-input" type="number" min="1"
              [value]="model().ordem"
              (input)="setField('ordem', $any($event.target).value)"
              (blur)="tocou('ordem')"
              placeholder="1" />
            @if (erroVisivel('ordem')) {
              <span class="b-error-message">{{ erroVisivel('ordem') }}</span>
            }
            <span class="campo__hint">Categorias com menor número aparecem primeiro no cardápio.</span>
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
                {{ editandoId() ? 'Salvar' : 'Criar categoria' }}
              }
            </button>
          </div>
        </div>
      </aside>
    }

    @if (categoriaParaExcluir()) {
      <app-confirm-dialog
        title="Excluir categoria?"
        [message]="mensagemExclusao()"
        confirmLabel="Excluir" cancelLabel="Cancelar" [confirmDanger]="true"
        (confirmed)="confirmarExclusao()" (cancelled)="categoriaParaExcluir.set(null)" />
    }
  `,
  styles: [`
    .layout { display: flex; flex-direction: column; min-height: 100dvh; background-color: var(--b-bg); font-family: var(--b-font-sans); }

    .topbar { display: flex; align-items: center; gap: var(--b-space-3); padding: var(--b-space-4) var(--b-space-6); background-color: var(--b-bg-elevated); border-bottom: 1px solid var(--b-neutral-100); box-shadow: var(--b-shadow-1); }
    .topbar__title { flex: 1; font-size: var(--b-font-size-2xl); font-weight: var(--b-font-weight-extrabold); color: var(--b-fg); margin: 0; }
    .btn-novo { display: flex; align-items: center; gap: var(--b-space-2); min-height: 44px; white-space: nowrap; }

    .toolbar { display: flex; align-items: center; gap: var(--b-space-3); flex-wrap: wrap; padding: var(--b-space-3) var(--b-space-6); background-color: var(--b-bg-elevated); border-bottom: 1px solid var(--b-neutral-100); }
    .search-box { display: flex; align-items: center; gap: var(--b-space-2); padding: var(--b-space-2) var(--b-space-3); background-color: var(--b-bg-sunken); border: 1px solid var(--b-neutral-200); border-radius: var(--b-radius-sm); width: 260px; max-width: 100%; }
    .search-input { flex: 1; border: none; background: transparent; font-size: var(--b-font-size-sm); color: var(--b-fg); outline: none; font-family: var(--b-font-sans); &::placeholder { color: var(--b-fg-subtle); } }
    .search-clear { display: flex; align-items: center; border: none; background: transparent; color: var(--b-fg-muted); cursor: pointer; padding: 2px; &:hover { color: var(--b-fg); } }
    .toolbar__count { margin-left: auto; font-size: var(--b-font-size-sm); color: var(--b-fg-muted); }

    .content { flex: 1; padding: var(--b-space-6); }
    @media (max-width: 767px) {
      .topbar { padding: var(--b-space-4) var(--b-space-4); }
      .toolbar { padding: var(--b-space-3) var(--b-space-4); }
      .search-box { width: 100%; }
      .content { padding: var(--b-space-4); }
    }

    .table-wrap { background-color: var(--b-bg-elevated); border-radius: var(--b-radius-md); border: 1px solid var(--b-neutral-100); box-shadow: var(--b-shadow-1); overflow: auto; }
    .tabela { width: 100%; border-collapse: collapse; font-size: var(--b-font-size-sm); font-family: var(--b-font-sans);
      th { text-align: left; padding: var(--b-space-3) var(--b-space-4); font-size: var(--b-font-size-xs); font-weight: var(--b-font-weight-bold); color: var(--b-fg-muted); text-transform: uppercase; letter-spacing: 0.04em; background-color: var(--b-bg-sunken); border-bottom: 1px solid var(--b-neutral-100); }
      td { padding: var(--b-space-3) var(--b-space-4); border-bottom: 1px solid var(--b-neutral-100); vertical-align: middle; }
    }
    .th-ordem { width: 80px; text-align: center; }
    .tabela__row { transition: background-color 0.1s; &:hover { background-color: var(--b-bg-sunken); } &:last-child td { border-bottom: none; } }
    .tabela__ordem { text-align: center; }
    .ordem-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: var(--b-radius-sm); background-color: var(--b-bg-sunken); border: 1px solid var(--b-neutral-200); font-size: var(--b-font-size-xs); font-weight: var(--b-font-weight-bold); color: var(--b-fg-muted); }
    .tabela__nome { font-weight: var(--b-font-weight-semibold); color: var(--b-fg); }
    .tabela__acoes { display: flex; gap: var(--b-space-1); justify-content: flex-end; }

    .acao-btn { display: flex; align-items: center; justify-content: center; min-width: 36px; min-height: 36px; border-radius: var(--b-radius-sm); border: 1px solid transparent; background: transparent; cursor: pointer; &--edit { color: var(--b-fg-muted); &:hover { background: var(--b-bg-sunken); color: var(--b-fg); border-color: var(--b-neutral-200); } } &--delete { color: var(--b-danger-400); &:hover { background: var(--b-danger-50); border-color: var(--b-danger-200); color: var(--b-danger-600); } } }

    .empty-state { display: flex; flex-direction: column; align-items: center; gap: var(--b-space-3); padding: var(--b-space-16) var(--b-space-4); text-align: center; color: var(--b-fg-muted); font-size: var(--b-font-size-sm); }
    .empty-state__title { font-size: var(--b-font-size-lg); font-weight: var(--b-font-weight-semibold); color: var(--b-fg); margin: 0; }

    /* Painel */
    .painel-backdrop { position: fixed; inset: 0; background-color: rgba(44,26,14,0.4); backdrop-filter: blur(2px); z-index: 100; }
    .painel { position: fixed; top: 0; right: 0; bottom: 0; width: 100%; max-width: 440px; background-color: var(--b-bg-elevated); box-shadow: var(--b-shadow-4); z-index: 101; display: flex; flex-direction: column; overflow-y: auto; }
    .painel__header { display: flex; align-items: center; justify-content: space-between; padding: var(--b-space-5); border-bottom: 1px solid var(--b-neutral-100); flex-shrink: 0; }
    .painel__titulo { font-size: var(--b-font-size-xl); font-weight: var(--b-font-weight-bold); color: var(--b-fg); margin: 0; }
    .painel__fechar { display: flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; border-radius: var(--b-radius-sm); border: none; background: transparent; color: var(--b-fg-muted); cursor: pointer; &:hover { background-color: var(--b-bg-sunken); } }
    .painel__form { flex: 1; padding: var(--b-space-5); display: flex; flex-direction: column; gap: var(--b-space-4); }
    .campo { display: flex; flex-direction: column; gap: var(--b-space-2); }
    .obrigatorio { color: var(--b-danger-500); }
    .campo__hint { font-size: var(--b-font-size-xs); color: var(--b-fg-muted); }
    .painel__acoes { display: flex; justify-content: flex-end; gap: var(--b-space-3); padding-top: var(--b-space-4); border-top: 1px solid var(--b-neutral-100); margin-top: auto;
      button { min-height: 44px; display: flex; align-items: center; gap: var(--b-space-2); &:disabled { opacity: 0.6; cursor: not-allowed; } }
    }

  `],
})
export class CategoriasComponent {
  protected readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  protected readonly skeletons = Array.from({ length: 5 }, (_, i) => i);

  protected readonly busca = signal('');

  protected readonly categorias = resource({
    loader: () => this.adminService.listarCategorias(),
  });

  protected readonly categoriasFiltradas = computed(() => {
    const lista = [...(this.categorias.value() ?? [])].sort((a, b) => a.ordem - b.ordem);
    const q = this.busca().toLowerCase().trim();
    return lista.filter(c => !q || c.nome.toLowerCase().includes(q));
  });

  // Form state
  protected readonly painelAberto = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly salvando = signal(false);
  protected readonly categoriaParaExcluir = signal<Categoria | null>(null);

  protected readonly model = signal<CategoriaModel>({ ...MODELO_VAZIO });
  private readonly _tocados = signal<Set<Campo>>(new Set());

  protected readonly erros = computed(() => {
    const m = this.model();
    const e: Partial<Record<Campo, string>> = {};
    if (!m.nome.trim() || m.nome.trim().length < 2) e.nome = 'Nome é obrigatório (mín. 2 caracteres)';
    if (!m.ordem || Number(m.ordem) < 1) e.ordem = 'Ordem deve ser um número maior que zero';
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
    this._tocados.set(new Set<Campo>(['nome', 'ordem']));
  }

  protected abrirCriar(): void {
    this.editandoId.set(null);
    this.model.set({ ...MODELO_VAZIO });
    this._tocados.set(new Set());
    this.painelAberto.set(true);
  }

  protected abrirEditar(cat: Categoria): void {
    this.editandoId.set(cat.id);
    this.model.set({ nome: cat.nome, ordem: String(cat.ordem) });
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
    const payload: CriarCategoriaPayload = {
      nome: m.nome.trim(),
      ordem: Number(m.ordem),
    };

    try {
      const id = this.editandoId();
      if (id) {
        await this.adminService.editarCategoria(id, payload);
        this.toast.success('Categoria atualizada!');
      } else {
        await this.adminService.criarCategoria(payload);
        this.toast.success('Categoria criada!');
      }
      this.fecharPainel();
      this.categorias.reload();
    } catch {
      this.toast.danger('Não foi possível salvar a categoria. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  protected pedirExclusao(cat: Categoria): void {
    this.categoriaParaExcluir.set(cat);
  }

  protected mensagemExclusao(): string {
    const nome = this.categoriaParaExcluir()?.nome ?? '';
    return `Deseja excluir "${nome}"? Os produtos desta categoria perderão o vínculo.`;
  }

  protected async confirmarExclusao(): Promise<void> {
    const cat = this.categoriaParaExcluir();
    if (!cat) return;
    this.categoriaParaExcluir.set(null);
    try {
      await this.adminService.excluirCategoria(cat.id);
      this.toast.success(`"${cat.nome}" excluída.`);
      this.categorias.reload();
    } catch {
      this.toast.danger('Não foi possível excluir a categoria.');
    }
  }

}
