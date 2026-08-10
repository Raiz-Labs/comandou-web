import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, throwError, NEVER } from 'rxjs';
import {
  LUCIDE_ICONS,
  LucideIconProvider,
  PackageX,
  Search,
  SearchX,
  Utensils,
  UtensilsCrossed,
  WifiOff,
  X,
} from 'lucide-angular';
import { CardapioComponent } from './cardapio.component';
import { ApiService } from '../../core/api/api.service';

const makeCardapio = () => ({
  restaurante: { id: 'tenant-1', nome: 'Restaurante Teste', slug: 'teste' },
  categorias: [
    {
      id: 'cat-1',
      nome: 'Lanches',
      produtos: [
        { id: 'produto-1', nome: 'X-Burguer', descricao: 'Com queijo', preco: 20, estoque: 5 },
      ],
    },
  ],
});

describe('CardapioComponent — cardápio público sem login (#34)', () => {
  let apiMock: { get: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    apiMock = { get: vi.fn() };

    TestBed.configureTestingModule({
      imports: [CardapioComponent],
      providers: [
        { provide: ApiService, useValue: apiMock },
        {
          provide: LUCIDE_ICONS,
          multi: true,
          useValue: new LucideIconProvider({
            UtensilsCrossed, Search, X, WifiOff, SearchX, PackageX, Utensils,
          }),
        },
      ],
    });
  });

  it('busca os dados em /cardapio (endpoint público) e não em rotas autenticadas', async () => {
    apiMock.get.mockReturnValue(of(makeCardapio()));
    const fixture = TestBed.createComponent(CardapioComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(apiMock.get).toHaveBeenCalledWith('/cardapio');
    expect(apiMock.get).not.toHaveBeenCalledWith('/categorias');
    expect(apiMock.get).not.toHaveBeenCalledWith(expect.stringContaining('/produtos'));
  });

  it('mostra o skeleton enquanto carrega', () => {
    apiMock.get.mockReturnValue(NEVER);
    const fixture = TestBed.createComponent(CardapioComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance['dados'].isLoading()).toBe(true);
  });

  it('renderiza os produtos agrupados por categoria, como devolvidos pela API', async () => {
    apiMock.get.mockReturnValue(of(makeCardapio()));
    const fixture = TestBed.createComponent(CardapioComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const titulos = fixture.debugElement.queryAll(By.css('.secao__titulo'));
    expect(titulos[0].nativeElement.textContent).toContain('Lanches');
    expect(fixture.nativeElement.textContent).toContain('X-Burguer');
  });

  it('em erro de carregamento, mostra a UI de erro e "Tentar novamente" recarrega', async () => {
    apiMock.get.mockReturnValueOnce(throwError(() => new Error('network error')));
    const fixture = TestBed.createComponent(CardapioComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance['dados'].error()).toBeTruthy();
    const retryBtn = fixture.debugElement.query(By.css('.empty-state button.b-btn-secondary'));
    expect(retryBtn).toBeTruthy();

    apiMock.get.mockReturnValueOnce(of(makeCardapio()));
    retryBtn.nativeElement.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance['dados'].hasValue()).toBe(true);
  });

  it('busca sem resultado mostra estado vazio', async () => {
    apiMock.get.mockReturnValue(of(makeCardapio()));
    const fixture = TestBed.createComponent(CardapioComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance['busca'].set('inexistente');
    fixture.detectChanges();

    expect(fixture.componentInstance['resultadoBusca']()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Nenhum resultado');
  });

  it('busca com resultado filtra por nome/descrição em todas as categorias', async () => {
    apiMock.get.mockReturnValue(of(makeCardapio()));
    const fixture = TestBed.createComponent(CardapioComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance['busca'].set('queijo');
    fixture.detectChanges();

    expect(fixture.componentInstance['resultadoBusca']().map(p => p.id)).toEqual(['produto-1']);
  });
});
