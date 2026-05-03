import {
  Component,
  inject,
  signal,
  computed,
  resource,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { CurrencyBrPipe } from '../../shared/pipes/currency-br.pipe';
import { LucideAngularModule } from 'lucide-angular';
import { Categoria, Produto } from '../../shared/types';

interface CategoriaComProdutos extends Categoria {
  produtos: Produto[];
}

@Component({
  selector: 'app-cardapio',
  standalone: true,
  imports: [SkeletonComponent, CurrencyBrPipe, LucideAngularModule],
  template: `
    <div class="layout">
      <!-- Header -->
      <header class="header">
        <div class="header__brand">
          <lucide-icon name="utensils-crossed" [size]="28" color="var(--b-primary-500)" />
          <div>
            <h1 class="header__title">Cardápio</h1>
            <p class="header__sub">Veja nossos pratos e bebidas</p>
          </div>
        </div>

        <!-- Busca -->
        <div class="search-box">
          <lucide-icon name="search" [size]="16" color="var(--b-fg-subtle)" />
          <input class="search-input" type="search" placeholder="Buscar no cardápio..."
            [value]="busca()" (input)="busca.set($any($event.target).value)"
            autocomplete="off" />
          @if (busca()) {
            <button class="search-clear" (click)="busca.set('')" aria-label="Limpar">
              <lucide-icon name="x" [size]="14" />
            </button>
          }
        </div>
      </header>

      <!-- Tabs de categoria (sticky) -->
      @if (!dados.isLoading() && !dados.error() && !busca()) {
        <nav class="cat-tabs" aria-label="Categorias">
          <button class="cat-tab" [class.cat-tab--active]="catAtiva() === null"
            (click)="catAtiva.set(null)">
            Todos
          </button>
          @for (cat of categoriasComItens(); track cat.id) {
            <button class="cat-tab" [class.cat-tab--active]="catAtiva() === cat.id"
              (click)="scrollParaCategoria(cat.id)">
              {{ cat.nome }}
            </button>
          }
        </nav>
      }

      <!-- Conteúdo -->
      <main class="content">
        @if (dados.isLoading()) {
          <!-- Skeleton -->
          @for (i of [1, 2, 3]; track i) {
            <div class="secao-skeleton">
              <app-skeleton height="1.5rem" width="140px" />
              <div class="produtos-grid">
                @for (j of [1, 2, 3, 4]; track j) {
                  <div class="card-skeleton">
                    <app-skeleton height="120px" width="100%" />
                    <div style="padding: var(--b-space-3); display:flex;flex-direction:column;gap:var(--b-space-2)">
                      <app-skeleton height="1rem" width="80%" />
                      <app-skeleton height="0.75rem" width="60%" />
                      <app-skeleton height="1.25rem" width="70px" />
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        } @else if (dados.error()) {
          <div class="empty-state">
            <lucide-icon name="wifi-off" [size]="44" color="var(--b-fg-subtle)" />
            <p class="empty-state__title">Cardápio indisponível</p>
            <p class="empty-state__sub">Não foi possível carregar o cardápio. Tente novamente.</p>
            <button class="b-btn-secondary" (click)="dados.reload()">Tentar novamente</button>
          </div>
        } @else if (busca()) {
          <!-- Resultado de busca -->
          @if (resultadoBusca().length === 0) {
            <div class="empty-state">
              <lucide-icon name="search-x" [size]="44" color="var(--b-fg-subtle)" />
              <p class="empty-state__title">Nenhum resultado</p>
              <p class="empty-state__sub">Nenhum item corresponde a "{{ busca() }}".</p>
              <button class="b-btn-ghost" (click)="busca.set('')">Limpar busca</button>
            </div>
          } @else {
            <div class="secao">
              <h2 class="secao__titulo">
                <lucide-icon name="search" [size]="16" />
                {{ resultadoBusca().length }} resultado{{ resultadoBusca().length !== 1 ? 's' : '' }} para "{{ busca() }}"
              </h2>
              <div class="produtos-grid">
                @for (p of resultadoBusca(); track p.id) {
                  <article class="produto-card">
                    <div class="produto-card__img-wrap">
                      @if (p.imagemUrl) {
                        <img class="produto-card__img" [src]="p.imagemUrl" [alt]="p.nome" loading="lazy" />
                      } @else {
                        <div class="produto-card__img-placeholder">
                          <lucide-icon name="utensils" [size]="28" color="var(--b-fg-subtle)" />
                        </div>
                      }
                    </div>
                    <div class="produto-card__info">
                      <h3 class="produto-card__nome">{{ p.nome }}</h3>
                      @if (p.descricao) { <p class="produto-card__desc">{{ p.descricao }}</p> }
                      <span class="produto-card__preco">{{ p.preco | currencyBr }}</span>
                    </div>
                  </article>
                }
              </div>
            </div>
          }
        } @else if (categoriasComItens().length === 0) {
          <div class="empty-state">
            <lucide-icon name="package-x" [size]="44" color="var(--b-fg-subtle)" />
            <p class="empty-state__title">Cardápio vazio</p>
            <p class="empty-state__sub">Nenhum item disponível no momento.</p>
          </div>
        } @else {
          @for (cat of categoriasComItens(); track cat.id) {
            <section class="secao" [id]="'cat-' + cat.id">
              <h2 class="secao__titulo">{{ cat.nome }}</h2>
              <div class="produtos-grid">
                @for (p of cat.produtos; track p.id) {
                  <article class="produto-card">
                    <!-- Imagem -->
                    <div class="produto-card__img-wrap">
                      @if (p.imagemUrl) {
                        <img class="produto-card__img" [src]="p.imagemUrl" [alt]="p.nome" loading="lazy" />
                      } @else {
                        <div class="produto-card__img-placeholder">
                          <lucide-icon name="utensils" [size]="28" color="var(--b-fg-subtle)" />
                        </div>
                      }
                      @if (!p.disponivel) {
                        <div class="produto-card__indisponivel">Indisponível</div>
                      }
                    </div>
                    <!-- Info -->
                    <div class="produto-card__info">
                      <h3 class="produto-card__nome">{{ p.nome }}</h3>
                      @if (p.descricao) {
                        <p class="produto-card__desc">{{ p.descricao }}</p>
                      }
                      <span class="produto-card__preco">{{ p.preco | currencyBr }}</span>
                    </div>
                  </article>
                }
              </div>
            </section>
          }
        }
      </main>

      <!-- Footer -->
      <footer class="footer">
        <p>Cardápio digital · Comandou</p>
      </footer>
    </div>
  `,
  styles: [`
    .layout { display: flex; flex-direction: column; min-height: 100dvh; background-color: var(--b-bg); font-family: var(--b-font-sans); }

    /* Header */
    .header { background-color: var(--b-bg-elevated); border-bottom: 1px solid var(--b-neutral-100); box-shadow: var(--b-shadow-1); padding: var(--b-space-5) var(--b-space-4); display: flex; flex-direction: column; gap: var(--b-space-4); }
    .header__brand { display: flex; align-items: center; gap: var(--b-space-3); }
    .header__title { font-size: var(--b-font-size-2xl); font-weight: var(--b-font-weight-extrabold); color: var(--b-fg); margin: 0; }
    .header__sub { font-size: var(--b-font-size-sm); color: var(--b-fg-muted); margin: 0; }

    /* Busca */
    .search-box { display: flex; align-items: center; gap: var(--b-space-2); padding: var(--b-space-3) var(--b-space-3); background-color: var(--b-bg-sunken); border: 1px solid var(--b-neutral-200); border-radius: var(--b-radius-sm); }
    .search-input { flex: 1; border: none; background: transparent; font-size: var(--b-font-size-sm); color: var(--b-fg); outline: none; font-family: var(--b-font-sans); &::placeholder { color: var(--b-fg-subtle); } }
    .search-clear { display: flex; align-items: center; border: none; background: transparent; color: var(--b-fg-muted); cursor: pointer; padding: 2px; &:hover { color: var(--b-fg); } }

    /* Tabs de categoria */
    .cat-tabs { position: sticky; top: 0; z-index: 10; display: flex; gap: var(--b-space-2); overflow-x: auto; padding: var(--b-space-3) var(--b-space-4); background-color: var(--b-bg-elevated); border-bottom: 1px solid var(--b-neutral-100); scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
    .cat-tab { flex-shrink: 0; padding: var(--b-space-2) var(--b-space-4); border-radius: var(--b-radius-sm); border: 1px solid var(--b-neutral-200); background: transparent; font-size: var(--b-font-size-sm); font-weight: var(--b-font-weight-medium); color: var(--b-fg-muted); cursor: pointer; font-family: var(--b-font-sans); min-height: 36px; white-space: nowrap; transition: all 0.15s; &:hover { background-color: var(--b-bg-sunken); } &--active { background-color: var(--b-primary-500); border-color: var(--b-primary-500); color: var(--b-fg-inverted); font-weight: var(--b-font-weight-semibold); } }

    /* Content */
    .content { flex: 1; padding: var(--b-space-5) var(--b-space-4); display: flex; flex-direction: column; gap: var(--b-space-8); }

    /* Seção */
    .secao { display: flex; flex-direction: column; gap: var(--b-space-4); }
    .secao-skeleton { display: flex; flex-direction: column; gap: var(--b-space-4); }
    .secao__titulo { display: flex; align-items: center; gap: var(--b-space-2); font-size: var(--b-font-size-xl); font-weight: var(--b-font-weight-extrabold); color: var(--b-fg); margin: 0; padding-bottom: var(--b-space-2); border-bottom: 2px solid var(--b-primary-500); width: fit-content; }

    /* Grid de produtos */
    .produtos-grid { display: grid; grid-template-columns: 1fr; gap: var(--b-space-3);
      @media (min-width: 480px) { grid-template-columns: repeat(2, 1fr); }
      @media (min-width: 768px) { grid-template-columns: repeat(3, 1fr); }
      @media (min-width: 1024px) { grid-template-columns: repeat(4, 1fr); }
    }

    /* Card de produto */
    .produto-card { background-color: var(--b-bg-elevated); border-radius: var(--b-radius-md); border: 1px solid var(--b-neutral-100); box-shadow: var(--b-shadow-1); overflow: hidden; display: flex; flex-direction: column; transition: box-shadow 0.2s, transform 0.15s;
      &:hover { box-shadow: var(--b-shadow-3); transform: translateY(-2px); }
    }
    .card-skeleton { background-color: var(--b-bg-elevated); border-radius: var(--b-radius-md); border: 1px solid var(--b-neutral-100); overflow: hidden; }
    .produto-card__img-wrap { position: relative; width: 100%; aspect-ratio: 16 / 9; overflow: hidden; background-color: var(--b-bg-sunken); }
    .produto-card__img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .produto-card__img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
    .produto-card__indisponivel { position: absolute; inset: 0; background-color: rgba(44,26,14,0.55); display: flex; align-items: center; justify-content: center; font-size: var(--b-font-size-sm); font-weight: var(--b-font-weight-bold); color: white; letter-spacing: 0.02em; }
    .produto-card__info { padding: var(--b-space-3); display: flex; flex-direction: column; gap: var(--b-space-2); flex: 1; }
    .produto-card__nome { font-size: var(--b-font-size-base); font-weight: var(--b-font-weight-bold); color: var(--b-fg); margin: 0; line-height: 1.3; }
    .produto-card__desc { font-size: var(--b-font-size-xs); color: var(--b-fg-muted); margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .produto-card__preco { font-size: var(--b-font-size-lg); font-weight: var(--b-font-weight-extrabold); color: var(--b-primary-500); margin-top: auto; }

    /* Empty / error */
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: var(--b-space-3); padding: var(--b-space-16) var(--b-space-4); text-align: center; }
    .empty-state__title { font-size: var(--b-font-size-xl); font-weight: var(--b-font-weight-bold); color: var(--b-fg); margin: 0; }
    .empty-state__sub { font-size: var(--b-font-size-sm); color: var(--b-fg-muted); margin: 0; }

    /* Footer */
    .footer { padding: var(--b-space-6) var(--b-space-4); text-align: center; font-size: var(--b-font-size-xs); color: var(--b-fg-subtle); border-top: 1px solid var(--b-neutral-100); }
  `],
})
export class CardapioComponent {
  private readonly api = inject(ApiService);

  protected readonly busca = signal('');
  protected readonly catAtiva = signal<string | null>(null);

  protected readonly dados = resource({
    loader: async () => {
      const [categorias, produtos] = await Promise.all([
        firstValueFrom(this.api.get<Categoria[]>('/categorias')),
        firstValueFrom(this.api.get<Produto[]>('/produtos?disponivel=true')),
      ]);
      return { categorias, produtos };
    },
  });

  protected readonly categoriasComItens = computed((): CategoriaComProdutos[] => {
    const d = this.dados.value();
    if (!d) return [];
    return d.categorias
      .map(cat => ({
        ...cat,
        produtos: d.produtos.filter(p => p.categoriaId === cat.id && p.disponivel),
      }))
      .filter(cat => cat.produtos.length > 0)
      .sort((a, b) => a.ordem - b.ordem);
  });

  protected readonly resultadoBusca = computed((): Produto[] => {
    const q = this.busca().toLowerCase().trim();
    if (!q) return [];
    return (this.dados.value()?.produtos ?? []).filter(p =>
      p.disponivel &&
      (p.nome.toLowerCase().includes(q) || (p.descricao ?? '').toLowerCase().includes(q))
    );
  });

  protected scrollParaCategoria(catId: string): void {
    this.catAtiva.set(catId);
    const el = document.getElementById('cat-' + catId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

}
