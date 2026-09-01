import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  LUCIDE_ICONS,
  LucideIconProvider,
  ArrowLeft,
  Check,
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

describe('AdminMesasComponent — recarrega ao focar a aba (#17)', () => {
  let adminServiceMock: { listarMesas: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    adminServiceMock = {
      listarMesas: vi.fn().mockResolvedValue([{ id: 'mesa-1', numero: 1, status: 'livre' }]),
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
            ArrowLeft, Check, LayoutGrid, Loader2, Pencil, Plus, Search, Trash2, WifiOff, X,
          }),
        },
      ],
    });
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
