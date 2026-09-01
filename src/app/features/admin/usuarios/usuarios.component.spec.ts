import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  LUCIDE_ICONS,
  LucideIconProvider,
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Search,
  UserPlus,
  Users,
  WifiOff,
  X,
  XCircle,
} from 'lucide-angular';
import { UsuariosComponent } from './usuarios.component';
import { AdminService } from '../admin.service';
import { ToastService } from '../../../shared/components/toast/toast.service';

describe('UsuariosComponent — recarrega ao focar a aba (#17)', () => {
  let adminServiceMock: { listarUsuarios: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    adminServiceMock = {
      listarUsuarios: vi.fn().mockResolvedValue([
        { id: 'u-1', nome: 'Ana', email: 'ana@test.com', perfil: 'admin', ativo: true },
      ]),
    };

    TestBed.configureTestingModule({
      imports: [UsuariosComponent],
      providers: [
        { provide: AdminService, useValue: adminServiceMock },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        { provide: ToastService, useValue: { success: vi.fn(), danger: vi.fn(), warning: vi.fn(), info: vi.fn() } },
        {
          provide: LUCIDE_ICONS,
          multi: true,
          useValue: new LucideIconProvider({
            ArrowLeft, Check, CheckCircle2, Eye, EyeOff, Loader2, Pencil, Search, UserPlus, Users, WifiOff, X, XCircle,
          }),
        },
      ],
    });
  });

  it('recarrega usuários quando a aba volta a ficar visível', async () => {
    const fixture = TestBed.createComponent(UsuariosComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    adminServiceMock.listarUsuarios.mockClear();

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(adminServiceMock.listarUsuarios).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await fixture.whenStable();

    expect(adminServiceMock.listarUsuarios).toHaveBeenCalledTimes(1);
  });
});
