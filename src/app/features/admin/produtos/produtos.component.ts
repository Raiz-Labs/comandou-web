import {
  Component,
  inject,
  signal,
  computed,
  resource,
  OnInit,
} from '@angular/core';
import { Router } from '@angular/router';
import { AdminService, CriarProdutoPayload } from '../admin.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { CurrencyBrPipe } from '../../../shared/pipes/currency-br.pipe';
import { Produto } from '../../../shared/types';

interface ProdutoModel {
  nome: string;
  descricao: string;
  preco: string; // string para bind nativo de input[type=number]
  categoriaId: string;
  estoque: string;
  disponivel: boolean;
}

const MODELO_VAZIO: ProdutoModel = {
  nome: '', descricao: '', preco: '', categoriaId: '', estoque: '0', disponivel: true,
};

type Campo = keyof ProdutoModel;

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [SkeletonComponent, ConfirmDialogComponent, CurrencyBrPipe],
  template: `
    <div class="layout">
      <!-- Topbar -->
      <header class="topbar">
        <button class="btn-back" (click)="router.navigateByUrl('/admin/dashboard')" aria-label="Voltar">
          <i data-lucide="arrow-left" style="width:18px;height:18px"></i>
        </button>
        <h1 class="topbar__title">Produtos</h1>
        <button class="b-btn-primary btn-novo" (click)="abrirCriar()">
          <i data-lucide="plus" style="width:16px;height:16px"></i>
          Novo produto
        </button>
      </header>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="search-box">
          <i data-lucide="search" style="width:15px;height:15px;color:var(--b-fg-subtle)"></i>
          <input class="search-input" type="search" placeholder="Buscar por nome..."
            [value]="busca()" (input)="busca.set($any($event.target).value)" autocomplete="off" />
          @if (busca()) {
            <button class="search-clear" (click)="busca.set('')" aria-label="Limpar">
              <i data-lucide="x" style="width:13px;height:13px"></i>
            </button>
          }
        </div>
        <div class="filtro-tabs">
          <button class="filtro-tab" [class.filtro-tab--active]="filtroDisp() === null"   (click)="filtroDisp.set(null)">Todos</button>
          <button class="filtro-tab" [class.filtro-tab--active]="filtroDisp() === true"   (click)="filtroDisp.set(true)">Disponíveis</button>
          <button class="filtro-tab" [class.filtro-tab--active]="filtroDisp() === false"  (click)="filtroDisp.set(false)">Indisponíveis</button>
        </div>
        @if (!produtos.isLoading()) {
          <span class="toolbar__count">{{ produtosFiltrados().length }} produto{{ produtosFiltrados().length !== 1 ? 's' : '' }}</span>
        }
      </div>

      <!-- Tabela -->
      <main class="content">
        @if (produtos.isLoading()) {
          <div class="table-wrap">
            <table class="tabela">
              <thead><tr><th>Nome</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Status</th><th></th></tr></thead>
              <tbody>
                @for (i of skeletons; track i) {
                  <tr>
                    @for (j of [1,2,3,4,5,6]; track j) {
                      <td><app-skeleton height="1rem" [width]="j === 6 ? '60px' : '80%'" /></td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else if (produtos.error()) {
          <div class="empty-state">
            <i data-lucide="wifi-off" style="width:40px;height:40px;color:var(--b-fg-subtle)"></i>
            <p>Erro ao carregar produtos</p>
            <button class="b-btn-secondary" (click)="produtos.reload()">Tentar novamente</button>
          </div>
        } @else if (produtosFiltrados().length === 0) {
          <div class="empty-state">
            <i data-lucide="package-x" style="width:48px;height:48px;color:var(--b-fg-subtle)"></i>
            <p class="empty-state__title">Nenhum produto encontrado</p>
            @if (!busca()) {
              <button class="b-btn-primary" (click)="abrirCriar()">
                <i data-lucide="plus" style="width:16px;height:16px"></i>
                Criar primeiro produto
              </button>
            }
          </div>
        } @else {
          <div class="table-wrap">
            <table class="tabela">
              <thead>
                <tr><th>Nome</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                @for (p of produtosFiltrados(); track p.id) {
                  <tr class="tabela__row">
                    <td>
                      <div class="tabela__nome">{{ p.nome }}</div>
                      @if (p.descricao) { <div class="tabela__desc">{{ p.descricao }}</div> }
                    </td>
                    <td class="tabela__cat">{{ p.categoria?.nome ?? '—' }}</td>
                    <td class="tabela__preco">{{ p.preco | currencyBr }}</td>
                    <td class="tabela__estoque">{{ p.estoque }}</td>
                    <td>
                      <span class="status-pill" [class.status-pill--on]="p.disponivel" [class.status-pill--off]="!p.disponivel">
                        {{ p.disponivel ? 'disponível' : 'indisponível' }}
                      </span>
                    </td>
                    <td class="tabela__acoes">
                      <button class="acao-btn acao-btn--edit" (click)="abrirEditar(p)" aria-label="Editar">
                        <i data-lucide="pencil" style="width:15px;height:15px"></i>
                      </button>
                      <button class="acao-btn acao-btn--delete" (click)="pedirExclusao(p)" aria-label="Excluir">
                        <i data-lucide="trash-2" style="width:15px;height:15px"></i>
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
          <h2 class="painel__titulo">{{ editandoId() ? 'Editar produto' : 'Novo produto' }}</h2>
          <button class="painel__fechar" (click)="fecharPainel()" aria-label="Fechar">
            <i data-lucide="x" style="width:20px;height:20px"></i>
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
              placeholder="Ex: Filé com fritas" />
            @if (erroVisivel('nome')) { <span class="b-error-message">{{ erroVisivel('nome') }}</span> }
          </div>

          <!-- Descrição -->
          <div class="campo">
            <label class="b-label" for="f-desc">Descrição</label>
            <textarea id="f-desc" class="b-input" rows="2"
              [value]="model().descricao"
              (input)="setField('descricao', $any($event.target).value)"
              placeholder="Breve descrição opcional"></textarea>
          </div>

          <!-- Preço + Estoque -->
          <div class="campo-row">
            <div class="campo">
              <label class="b-label" for="f-preco">Preço <span class="obrigatorio">*</span></label>
              <input id="f-preco" class="b-input" type="number" step="0.01" min="0"
                [value]="model().preco"
                (input)="setField('preco', $any($event.target).value)"
                (blur)="tocou('preco')"
                placeholder="0,00" />
              @if (erroVisivel('preco')) { <span class="b-error-message">{{ erroVisivel('preco') }}</span> }
            </div>
            <div class="campo">
              <label class="b-label" for="f-estoque">Estoque</label>
              <input id="f-estoque" class="b-input" type="number" min="0"
                [value]="model().estoque"
                (input)="setField('estoque', $any($event.target).value)"
                placeholder="0" />
            </div>
          </div>

          <!-- Categoria -->
          <div class="campo">
            <label class="b-label" for="f-cat">Categoria <span class="obrigatorio">*</span></label>
            <select id="f-cat" class="b-input"
              [value]="model().categoriaId"
              (change)="setField('categoriaId', $any($event.target).value)"
              (blur)="tocou('categoriaId')">
              <option value="">Selecione uma categoria</option>
              @for (cat of categorias.value() ?? []; track cat.id) {
                <option [value]="cat.id">{{ cat.nome }}</option>
              }
            </select>
            @if (erroVisivel('categoriaId')) { <span class="b-error-message">{{ erroVisivel('categoriaId') }}</span> }
          </div>

          <!-- Disponível -->
          <div class="campo campo--check">
            <label class="check-label">
              <input type="checkbox" class="check-input"
                [checked]="model().disponivel"
                (change)="setField('disponivel', $any($event.target).checked)" />
              <span>Disponível no cardápio</span>
            </label>
          </div>

          <!-- Ações -->
          <div class="painel__acoes">
            <button type="button" class="b-btn-secondary" (click)="fecharPainel()">Cancelar</button>
            <button type="button" class="b-btn-primary" [disabled]="salvando()" (click)="salvar()">
              @if (salvando()) {
                <i data-lucide="loader-2" style="width:16px;height:16px" class="spin"></i>
                Salvando...
              } @else {
                <i data-lucide="check" style="width:16px;height:16px"></i>
                {{ editandoId() ? 'Salvar' : 'Criar produto' }}
              }
            </button>
          </div>
        </div>
      </aside>
    }

    @if (produtoParaExcluir()) {
      <app-confirm-dialog
        title="Excluir produto?"
        [message]="mensagemExclusao()"
        confirmLabel="Excluir" cancelLabel="Cancelar" [confirmDanger]="true"
        (confirmed)="confirmarExclusao()" (cancelled)="produtoParaExcluir.set(null)" />
    }
  `,
  styles: [`
    .layout { display: flex; flex-direction: column; min-height: 100dvh; background-color: var(--b-bg); font-family: var(--b-font-sans); }

    .topbar { display: flex; align-items: center; gap: var(--b-space-3); padding: var(--b-space-4) var(--b-space-6); background-color: var(--b-bg-elevated); border-bottom: 1px solid var(--b-neutral-100); box-shadow: var(--b-shadow-1); }
    .btn-back { display: flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; border-radius: var(--b-radius-sm); border: 1px solid var(--b-neutral-200); background: transparent; color: var(--b-fg); cursor: pointer; flex-shrink: 0; &:hover { background-color: var(--b-bg-sunken); } }
    .topbar__title { flex: 1; font-size: var(--b-font-size-2xl); font-weight: var(--b-font-weight-extrabold); color: var(--b-fg); margin: 0; }
    .btn-novo { display: flex; align-items: center; gap: var(--b-space-2); min-height: 44px; white-space: nowrap; }

    .toolbar { display: flex; align-items: center; gap: var(--b-space-3); flex-wrap: wrap; padding: var(--b-space-3) var(--b-space-6); background-color: var(--b-bg-elevated); border-bottom: 1px solid var(--b-neutral-100); }
    .search-box { display: flex; align-items: center; gap: var(--b-space-2); padding: var(--b-space-2) var(--b-space-3); background-color: var(--b-bg-sunken); border: 1px solid var(--b-neutral-200); border-radius: var(--b-radius-sm); width: 260px; }
    .search-input { flex: 1; border: none; background: transparent; font-size: var(--b-font-size-sm); color: var(--b-fg); outline: none; font-family: var(--b-font-sans); &::placeholder { color: var(--b-fg-subtle); } }
    .search-clear { display: flex; align-items: center; border: none; background: transparent; color: var(--b-fg-muted); cursor: pointer; padding: 2px; &:hover { color: var(--b-fg); } }
    .filtro-tabs { display: flex; gap: var(--b-space-1); }
    .filtro-tab { padding: var(--b-space-1) var(--b-space-3); border-radius: var(--b-radius-sm); border: 1px solid var(--b-neutral-200); background: transparent; font-size: var(--b-font-size-sm); font-weight: var(--b-font-weight-medium); color: var(--b-fg-muted); cursor: pointer; font-family: var(--b-font-sans); min-height: 36px; &:hover { background-color: var(--b-bg-sunken); } &--active { background-color: var(--b-primary-500); border-color: var(--b-primary-500); color: var(--b-fg-inverted); font-weight: var(--b-font-weight-semibold); } }
    .toolbar__count { margin-left: auto; font-size: var(--b-font-size-sm); color: var(--b-fg-muted); }

    .content { flex: 1; padding: var(--b-space-6); }

    .table-wrap { background-color: var(--b-bg-elevated); border-radius: var(--b-radius-md); border: 1px solid var(--b-neutral-100); box-shadow: var(--b-shadow-1); overflow: auto; }
    .tabela { width: 100%; border-collapse: collapse; font-size: var(--b-font-size-sm); font-family: var(--b-font-sans); th { text-align: left; padding: var(--b-space-3) var(--b-space-4); font-size: var(--b-font-size-xs); font-weight: var(--b-font-weight-bold); color: var(--b-fg-muted); text-transform: uppercase; letter-spacing: 0.04em; background-color: var(--b-bg-sunken); border-bottom: 1px solid var(--b-neutral-100); } td { padding: var(--b-space-3) var(--b-space-4); border-bottom: 1px solid var(--b-neutral-100); vertical-align: middle; } }
    .tabela__row { transition: background-color 0.1s; &:hover { background-color: var(--b-bg-sunken); } &:last-child td { border-bottom: none; } }
    .tabela__nome { font-weight: var(--b-font-weight-semibold); color: var(--b-fg); }
    .tabela__desc { font-size: var(--b-font-size-xs); color: var(--b-fg-muted); margin-top: 2px; }
    .tabela__cat { color: var(--b-fg-muted); }
    .tabela__preco { font-weight: var(--b-font-weight-bold); color: var(--b-primary-600); }
    .tabela__estoque { color: var(--b-fg-muted); text-align: center; }
    .tabela__acoes { display: flex; gap: var(--b-space-1); justify-content: flex-end; }
    .status-pill { display: inline-flex; align-items: center; padding: 2px var(--b-space-2); border-radius: var(--b-radius-sm); font-size: var(--b-font-size-xs); font-weight: var(--b-font-weight-semibold); &--on { background: var(--b-success-100); color: var(--b-success-700); } &--off { background: var(--b-neutral-100); color: var(--b-neutral-600); } }
    .acao-btn { display: flex; align-items: center; justify-content: center; min-width: 36px; min-height: 36px; border-radius: var(--b-radius-sm); border: 1px solid transparent; background: transparent; cursor: pointer; &--edit { color: var(--b-fg-muted); &:hover { background: var(--b-bg-sunken); color: var(--b-fg); border-color: var(--b-neutral-200); } } &--delete { color: var(--b-danger-400); &:hover { background: var(--b-danger-50); border-color: var(--b-danger-200); color: var(--b-danger-600); } } }

    .empty-state { display: flex; flex-direction: column; align-items: center; gap: var(--b-space-3); padding: var(--b-space-16) var(--b-space-4); text-align: center; color: var(--b-fg-muted); font-size: var(--b-font-size-sm); }
    .empty-state__title { font-size: var(--b-font-size-lg); font-weight: var(--b-font-weight-semibold); color: var(--b-fg); margin: 0; }

    /* Painel */
    .painel-backdrop { position: fixed; inset: 0; background-color: rgba(44,26,14,0.4); backdrop-filter: blur(2px); z-index: 100; }
    .painel { position: fixed; top: 0; right: 0; bottom: 0; width: 100%; max-width: 480px; background-color: var(--b-bg-elevated); box-shadow: var(--b-shadow-4); z-index: 101; display: flex; flex-direction: column; overflow-y: auto; }
    .painel__header { display: flex; align-items: center; justify-content: space-between; padding: var(--b-space-5); border-bottom: 1px solid var(--b-neutral-100); flex-shrink: 0; }
    .painel__titulo { font-size: var(--b-font-size-xl); font-weight: var(--b-font-weight-bold); color: var(--b-fg); margin: 0; }
    .painel__fechar { display: flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; border-radius: var(--b-radius-sm); border: none; background: transparent; color: var(--b-fg-muted); cursor: pointer; &:hover { background-color: var(--b-bg-sunken); } }
    .painel__form { flex: 1; padding: var(--b-space-5); display: flex; flex-direction: column; gap: var(--b-space-4); }
    .campo { display: flex; flex-direction: column; gap: var(--b-space-2); }
    .campo-row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--b-space-3); }
    .obrigatorio { color: var(--b-danger-500); }
    .campo--check { flex-direction: row; align-items: center; }
    .check-label { display: flex; align-items: center; gap: var(--b-space-2); font-size: var(--b-font-size-sm); font-weight: var(--b-font-weight-medium); color: var(--b-fg); cursor: pointer; }
    .check-input { width: 18px; height: 18px; cursor: pointer; accent-color: var(--b-primary-500); }
    .painel__acoes { display: flex; justify-content: flex-end; gap: var(--b-space-3); padding-top: var(--b-space-4); border-top: 1px solid var(--b-neutral-100); margin-top: auto; }
    .painel__acoes button { min-height: 44px; display: flex; align-items: center; gap: var(--b-space-2); &:disabled { opacity: 0.6; cursor: not-allowed; } }

    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class ProdutosComponent implements OnInit {
  protected readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  protected readonly skeletons = Array.from({ length: 5 }, (_, i) => i);

  // Listagem
  protected readonly busca = signal('');
  protected readonly filtroDisp = signal<boolean | null>(null);

  protected readonly produtos = resource({
    loader: () => this.adminService.listarProdutos(),
  });

  protected readonly categorias = resource({
    loader: () => this.adminService.listarCategorias(),
  });

  protected readonly produtosFiltrados = computed(() => {
    const lista = this.produtos.value() ?? [];
    const q = this.busca().toLowerCase().trim();
    const disp = this.filtroDisp();
    return lista.filter(p =>
      (!q || p.nome.toLowerCase().includes(q)) &&
      (disp === null || p.disponivel === disp)
    );
  });

  // Form state (Signal Forms manual)
  protected readonly painelAberto = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly salvando = signal(false);
  protected readonly produtoParaExcluir = signal<Produto | null>(null);

  protected readonly model = signal<ProdutoModel>({ ...MODELO_VAZIO });
  private readonly _tocados = signal<Set<Campo>>(new Set());

  protected readonly erros = computed(() => {
    const m = this.model();
    const e: Partial<Record<Campo, string>> = {};
    if (!m.nome.trim() || m.nome.trim().length < 2) e.nome = 'Nome é obrigatório (mín. 2 caracteres)';
    if (!m.preco || Number(m.preco) <= 0) e.preco = 'Preço deve ser maior que zero';
    if (!m.categoriaId) e.categoriaId = 'Selecione uma categoria';
    return e;
  });

  protected readonly formValido = computed(() => Object.keys(this.erros()).length === 0);

  ngOnInit(): void {
    setTimeout(() => this.initLucide(), 100);
  }

  // Form helpers
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
    this._tocados.set(new Set<Campo>(['nome', 'preco', 'categoriaId', 'estoque', 'descricao', 'disponivel']));
  }

  // CRUD
  protected abrirCriar(): void {
    this.editandoId.set(null);
    this.model.set({ ...MODELO_VAZIO });
    this._tocados.set(new Set());
    this.painelAberto.set(true);
    setTimeout(() => this.initLucide(), 50);
  }

  protected abrirEditar(produto: Produto): void {
    this.editandoId.set(produto.id);
    this.model.set({
      nome: produto.nome,
      descricao: produto.descricao ?? '',
      preco: String(produto.preco),
      categoriaId: produto.categoriaId,
      estoque: String(produto.estoque),
      disponivel: produto.disponivel,
    });
    this._tocados.set(new Set());
    this.painelAberto.set(true);
    setTimeout(() => this.initLucide(), 50);
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
    const payload: CriarProdutoPayload = {
      nome: m.nome.trim(),
      descricao: m.descricao.trim() || undefined,
      preco: Number(m.preco),
      categoriaId: m.categoriaId,
      estoque: Number(m.estoque) || 0,
      disponivel: m.disponivel,
    };

    try {
      const id = this.editandoId();
      if (id) {
        await this.adminService.editarProduto(id, payload);
        this.toast.success('Produto atualizado!');
      } else {
        await this.adminService.criarProduto(payload);
        this.toast.success('Produto criado!');
      }
      this.fecharPainel();
      this.produtos.reload();
    } catch {
      this.toast.danger('Não foi possível salvar o produto. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  protected mensagemExclusao(): string {
    const nome = this.produtoParaExcluir()?.nome ?? '';
    return `Deseja excluir "${nome}"? Esta ação não pode ser desfeita.`;
  }

  protected pedirExclusao(produto: Produto): void {
    this.produtoParaExcluir.set(produto);
  }

  protected async confirmarExclusao(): Promise<void> {
    const produto = this.produtoParaExcluir();
    if (!produto) return;
    this.produtoParaExcluir.set(null);
    try {
      await this.adminService.excluirProduto(produto.id);
      this.toast.success(`"${produto.nome}" excluído.`);
      this.produtos.reload();
    } catch {
      this.toast.danger('Não foi possível excluir o produto.');
    }
  }

  private initLucide(): void {
    const win = window as unknown as { lucide?: { createIcons: () => void } };
    win.lucide?.createIcons();
  }
}
