import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  LUCIDE_ICONS,
  LucideIconProvider,
  Search,
  X,
} from 'lucide-angular';
import { SeletorProdutoComponent } from './seletor-produto.component';
import { Categoria, Produto } from '../../../shared/types';

const categorias: Categoria[] = [
  { id: 'cat-1', nome: 'Lanches', ordem: 1 },
  { id: 'cat-2', nome: 'Bebidas', ordem: 2 },
];

const produtos: Produto[] = [
  { id: 'p1', nome: 'X-Burguer', preco: 20, categoriaId: 'cat-1', estoque: 5, disponivel: true },
  { id: 'p2', nome: 'Suco de laranja', preco: 8, categoriaId: 'cat-2', estoque: 5, disponivel: true },
];

describe('SeletorProdutoComponent — filtro de produtos', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SeletorProdutoComponent],
      providers: [
        { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider({ Search, X }) },
      ],
    });
  });

  it('sem filtro, mostra todos os produtos agrupados por categoria', () => {
    const fixture = TestBed.createComponent(SeletorProdutoComponent);
    fixture.componentRef.setInput('cardapio', { categorias, produtos });
    fixture.detectChanges();

    expect(fixture.componentInstance['produtosFiltrados']().length).toBe(2);
  });

  it('filtra por categoria selecionada', () => {
    const fixture = TestBed.createComponent(SeletorProdutoComponent);
    fixture.componentRef.setInput('cardapio', { categorias, produtos });
    fixture.detectChanges();

    fixture.componentInstance['categoriaSelecionada'].set(categorias[1]);

    const filtrados = fixture.componentInstance['produtosFiltrados']();
    expect(filtrados.length).toBe(1);
    expect(filtrados[0].id).toBe('p2');
  });

  it('filtra por texto de busca (nome, case-insensitive)', () => {
    const fixture = TestBed.createComponent(SeletorProdutoComponent);
    fixture.componentRef.setInput('cardapio', { categorias, produtos });
    fixture.detectChanges();

    fixture.componentInstance['busca'].set('BURGUER');

    const filtrados = fixture.componentInstance['produtosFiltrados']();
    expect(filtrados.length).toBe(1);
    expect(filtrados[0].id).toBe('p1');
  });

  it('emite produtoEscolhido com o produto selecionado', () => {
    const fixture = TestBed.createComponent(SeletorProdutoComponent);
    fixture.componentRef.setInput('cardapio', { categorias, produtos });
    fixture.detectChanges();

    let escolhido: Produto | undefined;
    fixture.componentInstance.produtoEscolhido.subscribe((p: Produto) => (escolhido = p));

    fixture.componentInstance.produtoEscolhido.emit(produtos[0]);

    expect(escolhido).toEqual(produtos[0]);
  });
});
