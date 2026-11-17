import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  LUCIDE_ICONS,
  LucideIconProvider,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
  WifiOff,
  X,
} from 'lucide-angular';
import { CategoriasComponent } from './categorias.component';
import { AdminService } from '../admin.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

const pagina = <T>(items: T[]) => ({ items, total: items.length, totalPages: 1 });

describe('CategoriasComponent — paginação e busca (#19)', () => {
  let adminServiceMock: { listarCategorias: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    adminServiceMock = {
      listarCategorias: vi.fn().mockResolvedValue(pagina([{ id: 'cat-1', nome: 'Bebidas', ordem: 1 }])),
    };

    TestBed.configureTestingModule({
      imports: [CategoriasComponent],
      providers: [
        { provide: AdminService, useValue: adminServiceMock },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        { provide: ToastService, useValue: { success: vi.fn(), danger: vi.fn(), warning: vi.fn(), info: vi.fn() } },
        {
          provide: LUCIDE_ICONS,
          multi: true,
          useValue: new LucideIconProvider({
            ArrowLeft, Check, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Search, Tag, Trash2, WifiOff, X,
          }),
        },
      ],
    });
  });

  it('carrega a página 1 sem filtros ao montar', async () => {
    const fixture = TestBed.createComponent(CategoriasComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(adminServiceMock.listarCategorias).toHaveBeenCalledWith({ page: 1, busca: undefined });
    expect(fixture.componentInstance['itens']()).toEqual([{ id: 'cat-1', nome: 'Bebidas', ordem: 1 }]);
  });

  it('busca (já debounced) reseta a página pra 1 e é enviada ao service', async () => {
    const fixture = TestBed.createComponent(CategoriasComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp['page'].set(2);
    fixture.detectChanges();
    await fixture.whenStable();

    comp['buscaDebounced'].set('bebi');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(comp['page']()).toBe(1);
    expect(adminServiceMock.listarCategorias).toHaveBeenCalledWith({ page: 1, busca: 'bebi' });
  });

  it('recarrega categorias quando a aba volta a ficar visível', async () => {
    const fixture = TestBed.createComponent(CategoriasComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    adminServiceMock.listarCategorias.mockClear();

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(adminServiceMock.listarCategorias).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await fixture.whenStable();

    expect(adminServiceMock.listarCategorias).toHaveBeenCalledTimes(1);
  });
});
