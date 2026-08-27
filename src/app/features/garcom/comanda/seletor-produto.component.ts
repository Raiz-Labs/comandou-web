import { Component, computed, input, output, signal } from '@angular/core';
import { Categoria, Produto } from '../../../shared/types';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { CurrencyBrPipe } from '../../../shared/pipes/currency-br.pipe';
import { LucideAngularModule } from 'lucide-angular';

interface CategoriaComProdutos extends Categoria {
  produtos: Produto[];
}

@Component({
  selector: 'app-seletor-produto',
  standalone: true,
  imports: [SkeletonComponent, CurrencyBrPipe, LucideAngularModule],
  template: `
    <div class="b-backdrop" (click)="fechado.emit()"></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Selecionar produto">
      <div class="sheet__header">
        <h2 class="sheet__title">Selecionar produto</h2>
        <button class="sheet__close" (click)="fechado.emit()" aria-label="Fechar">
          <lucide-icon name="x" [size]="20" />
        </button>
      </div>

      <!-- Busca -->
      <div class="sheet__search">
        <lucide-icon name="search" [size]="16" color="var(--b-fg-subtle)" />
        <input
          class="b-input search-input"
          type="search"
          placeholder="Buscar produto..."
          [value]="busca()"
          (input)="setBusca($event)"
          autocomplete="off"
        />
      </div>

      <!-- Filtro de categorias -->
      @if (carregando()) {
        <div class="cat-tabs">
          @for (i of [1,2,3]; track i) {
            <app-skeleton height="32px" width="80px" radius="var(--b-radius-sm)" />
          }
        </div>
      } @else {
        <div class="cat-tabs">
          <button
            class="cat-tab"
            [class.cat-tab--active]="categoriaSelecionada() === null"
            (click)="categoriaSelecionada.set(null)"
          >
            Todos
          </button>
          @for (cat of (cardapio()?.categorias ?? []); track cat.id) {
            <button
              class="cat-tab"
              [class.cat-tab--active]="categoriaSelecionada()?.id === cat.id"
              (click)="categoriaSelecionada.set(cat)"
            >
              {{ cat.nome }}
            </button>
          }
        </div>
      }

      <!-- Lista de produtos -->
      <div class="sheet__produtos">
        @if (carregando()) {
          @for (i of [1,2,3,4]; track i) {
            <div class="produto-card produto-card--skeleton">
              <app-skeleton height="1rem" width="60%" />
              <app-skeleton height="0.875rem" width="40%" />
            </div>
          }
        } @else if (produtosFiltrados().length === 0) {
          <div class="b-empty-state" style="padding: var(--b-space-8) 0">
            <p class="b-empty-state__sub">Nenhum produto encontrado</p>
          </div>
        } @else {
          @for (cat of categoriasFiltradas(); track cat.id) {
            @if (cat.produtos.length > 0) {
              <div class="cat-label">{{ cat.nome }}</div>
              @for (produto of cat.produtos; track produto.id) {
                <button class="produto-card" (click)="produtoEscolhido.emit(produto)">
                  <div class="produto-card__info">
                    <span class="produto-card__nome">{{ produto.nome }}</span>
                    @if (produto.descricao) {
                      <span class="produto-card__desc">{{ produto.descricao }}</span>
                    }
                  </div>
                  <span class="produto-card__preco">{{ produto.preco | currencyBr }}</span>
                </button>
              }
            }
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .sheet {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-lg) var(--b-radius-lg) 0 0;
      box-shadow: var(--b-shadow-4);
      z-index: 301;
      max-height: 85dvh;
      display: flex;
      flex-direction: column;

      @media (min-width: 768px) {
        left: 50%;
        right: auto;
        width: 480px;
        transform: translateX(-50%);
        border-radius: var(--b-radius-lg);
        bottom: var(--b-space-6);
      }
    }

    .sheet__header {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
      padding: var(--b-space-4) var(--b-space-4) var(--b-space-3);
      border-bottom: 1px solid var(--b-neutral-100);
      flex-shrink: 0;
    }

    .sheet__title {
      flex: 1;
      font-size: var(--b-font-size-lg);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sheet__close {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      border-radius: var(--b-radius-sm);
      border: none;
      background-color: transparent;
      color: var(--b-fg-muted);
      flex-shrink: 0;

      &:hover { background-color: var(--b-bg-sunken); }
    }

    .sheet__search {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
      padding: var(--b-space-3) var(--b-space-4);
      border-bottom: 1px solid var(--b-neutral-100);
      flex-shrink: 0;
    }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: var(--b-font-size-sm);
      padding: var(--b-space-1) 0;
      outline: none;
      color: var(--b-fg);

      &::placeholder { color: var(--b-fg-subtle); }
    }

    .cat-tabs {
      display: flex;
      gap: var(--b-space-2);
      padding: var(--b-space-3) var(--b-space-4);
      overflow-x: auto;
      flex-shrink: 0;
      scrollbar-width: none;

      &::-webkit-scrollbar { display: none; }
    }

    .cat-tab {
      flex-shrink: 0;
      padding: var(--b-space-1) var(--b-space-3);
      border-radius: var(--b-radius-sm);
      border: 1px solid var(--b-neutral-200);
      background-color: transparent;
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-medium);
      color: var(--b-fg-muted);
      min-height: 36px;
      font-family: var(--b-font-sans);
      white-space: nowrap;

      &--active {
        background-color: var(--b-primary-500);
        border-color: var(--b-primary-500);
        color: var(--b-fg-inverted);
        font-weight: var(--b-font-weight-semibold);
      }
    }

    .sheet__produtos {
      flex: 1;
      overflow-y: auto;
      padding: 0 var(--b-space-4) var(--b-space-6);
      display: flex;
      flex-direction: column;
      gap: var(--b-space-2);
    }

    .cat-label {
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg-subtle);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding-top: var(--b-space-3);
      padding-bottom: var(--b-space-1);
    }

    .produto-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--b-space-3);
      padding: var(--b-space-3) var(--b-space-4);
      background-color: var(--b-bg);
      border-radius: var(--b-radius-md);
      border: 1px solid var(--b-neutral-100);
      cursor: pointer;
      text-align: left;
      font-family: var(--b-font-sans);
      min-height: 56px;
      transition: background-color 0.1s ease;

      &:hover { background-color: var(--b-primary-50); }
      &:active { background-color: var(--b-primary-100); }

      &--skeleton {
        cursor: default;
        gap: var(--b-space-3);
        flex-direction: column;
        align-items: flex-start;
        min-height: 64px;

        &:hover { background-color: var(--b-bg); }
      }
    }

    .produto-card__info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
    }

    .produto-card__nome {
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg);
    }

    .produto-card__desc {
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-muted);
    }

    .produto-card__preco {
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-primary-600);
      flex-shrink: 0;
    }
  `],
})
export class SeletorProdutoComponent {
  readonly cardapio = input<{ categorias: Categoria[]; produtos: Produto[] } | undefined>(undefined);
  readonly carregando = input(false);

  readonly produtoEscolhido = output<Produto>();
  readonly fechado = output<void>();

  protected readonly busca = signal('');
  protected readonly categoriaSelecionada = signal<Categoria | null>(null);

  protected readonly produtosFiltrados = computed(() => {
    const { categorias, produtos } = this.cardapio() ?? { categorias: [], produtos: [] };
    const cat = this.categoriaSelecionada();
    const q = this.busca().toLowerCase().trim();
    return produtos.filter(p =>
      (!cat || p.categoriaId === cat.id) &&
      (!q || p.nome.toLowerCase().includes(q) || (p.descricao ?? '').toLowerCase().includes(q))
    ).map(p => ({ ...p, categoria: categorias.find(c => c.id === p.categoriaId) }));
  });

  protected readonly categoriasFiltradas = computed<CategoriaComProdutos[]>(() => {
    const { categorias } = this.cardapio() ?? { categorias: [] };
    const filtrados = this.produtosFiltrados();
    return categorias.map(cat => ({
      ...cat,
      produtos: filtrados.filter(p => p.categoriaId === cat.id),
    }));
  });

  protected setBusca(event: Event): void {
    this.busca.set((event.target as HTMLInputElement).value);
  }
}
