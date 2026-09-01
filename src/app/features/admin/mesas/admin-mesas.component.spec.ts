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
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  WifiOff,
  X,
} from 'lucide-angular';
import { AdminMesasComponent } from './admin-mesas.component';
import { AdminService } from '../admin.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

const pagina = <T>(items: T[]) => ({ items, total: items.length, totalPages: 1 });

describe('AdminMesasComponent — paginação, busca e filtro de status (#19)', () => {
  let adminServiceMock: { listarMesas: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    adminServiceMock = {
      listarMesas: vi.fn().mockResolvedValue(pagina([{ id: 'mesa-1', numero: 1, status: 'livre' }])),
    };

    TestBed.configureTestingModule({
      imports: [AdminMesasComponent],
      providers: [
        { provide: AdminService, useValue: adminServiceMock },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        { provide: ToastService, useValue: { success: vi.fn(), danger: vi.fn(), warning: vi.fn(), info: vi.fn() } },
        {
          provide: LUCIDE_ICONS,
          multi: true,
          useValue: new LucideIconProvider({
            ArrowLeft, Check, ChevronLeft, ChevronRight, LayoutGrid, Loader2, Pencil, Plus, Search, Trash2, WifiOff, X,
          }),
        },
      ],
    });
  });

  it('carrega a página 1 sem filtros ao montar', async () => {
    const fixture = TestBed.createComponent(AdminMesasComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(adminServiceMock.listarMesas).toHaveBeenCalledWith({ page: 1, busca: undefined, status: undefined });
  });

  it('trocar o filtro de status reseta a página e manda status ao service', async () => {
    const fixture = TestBed.createComponent(AdminMesasComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp['page'].set(2);
    fixture.detectChanges();
    await fixture.whenStable();

    comp['filtroStatus'].set('ocupada');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(comp['page']()).toBe(1);
    expect(adminServiceMock.listarMesas).toHaveBeenCalledWith({ page: 1, busca: undefined, status: 'ocupada' });
  });

  it('recarrega mesas quando a aba volta a ficar visível', async () => {
    const fixture = TestBed.createComponent(AdminMesasComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    adminServiceMock.listarMesas.mockClear();

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(adminServiceMock.listarMesas).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await fixture.whenStable();

    expect(adminServiceMock.listarMesas).toHaveBeenCalledTimes(1);
  });
});
