import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  LUCIDE_ICONS,
  LucideIconProvider,
  ArrowLeft,
  Check,
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

describe('CategoriasComponent — recarrega ao focar a aba (#17)', () => {
  let adminServiceMock: { listarCategorias: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    adminServiceMock = {
      listarCategorias: vi.fn().mockResolvedValue([{ id: 'cat-1', nome: 'Lanches', ordem: 1 }]),
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
            ArrowLeft, Check, Loader2, Pencil, Plus, Search, Tag, Trash2, WifiOff, X,
          }),
        },
      ],
    });
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
