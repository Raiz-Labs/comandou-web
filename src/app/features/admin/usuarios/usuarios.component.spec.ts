import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  LUCIDE_ICONS,
  LucideIconProvider,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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

const pagina = <T>(items: T[]) => ({ items, total: items.length, totalPages: 1 });

describe('UsuariosComponent — paginação, busca e filtros (#19)', () => {
  let adminServiceMock: { listarUsuarios: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    adminServiceMock = {
      listarUsuarios: vi.fn().mockResolvedValue(
        pagina([{ id: 'u-1', nome: 'Ana', email: 'ana@test.com', perfil: 'admin', ativo: true }]),
      ),
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
            ArrowLeft, Check, CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, Pencil, Search, UserPlus, Users, WifiOff, X, XCircle,
          }),
        },
      ],
    });
  });

  it('carrega a página 1 filtrando só ativos por padrão (mostrarInativos = false)', async () => {
    const fixture = TestBed.createComponent(UsuariosComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(adminServiceMock.listarUsuarios).toHaveBeenCalledWith({
      page: 1,
      busca: undefined,
      perfil: undefined,
      ativo: true,
    });
  });

  it('marcar "mostrar inativos" para de enviar o filtro ativo e reseta a página', async () => {
    const fixture = TestBed.createComponent(UsuariosComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const comp = fixture.componentInstance;
    comp['page'].set(2);
    fixture.detectChanges();
    await fixture.whenStable();

    comp['mostrarInativos'].set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(comp['page']()).toBe(1);
    expect(adminServiceMock.listarUsuarios).toHaveBeenCalledWith({
      page: 1,
      busca: undefined,
      perfil: undefined,
      ativo: undefined,
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
