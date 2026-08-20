import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import {
  LUCIDE_ICONS,
  LucideIconProvider,
  BarChart2,
  Calculator,
  CheckCircle2,
  FileText,
  LayoutGrid,
  Package,
  Receipt,
  RefreshCw,
  Star,
  Table2,
  Tag,
  TrendingUp,
  Users,
  WifiOff,
  Zap,
} from 'lucide-angular';
import { DashboardComponent } from './dashboard.component';
import { AdminService, DashboardResumo } from '../admin.service';
import { RelatorioVendas } from '../../../shared/types';

const makeRelatorio = (overrides: Partial<RelatorioVendas> = {}): RelatorioVendas => ({
  resumo: { totalVendas: 1500, totalComandas: 10, ticketMedio: 150 },
  vendasPorDia: [{ data: '2024-01-01', total: 1500 }],
  topProdutos: [{ id: '1', nome: 'X-Burguer', quantidade: 8, total: 800 }],
  ...overrides,
});

const makeDashboard = (overrides: Partial<DashboardResumo> = {}): DashboardResumo => ({
  relatorio: makeRelatorio(),
  mesas: [],
  comandasAbertas: [],
  ...overrides,
});

const LUCIDE_PROVIDERS = [
  {
    provide: LUCIDE_ICONS,
    multi: true,
    useValue: new LucideIconProvider({
      BarChart2,
      Calculator,
      CheckCircle2,
      FileText,
      LayoutGrid,
      Package,
      Receipt,
      RefreshCw,
      Star,
      Table2,
      Tag,
      TrendingUp,
      Users,
      WifiOff,
      Zap,
    }),
  },
];

describe('DashboardComponent', () => {
  let adminServiceMock: { buscarDashboard: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    adminServiceMock = {
      buscarDashboard: vi.fn().mockResolvedValue(makeDashboard()),
    };

    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: AdminService, useValue: adminServiceMock },
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        ...LUCIDE_PROVIDERS,
      ],
    });
  });

  it('exibe os KPIs de receita, comandas fechadas e ticket médio do resumo', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const valores = fixture.debugElement.queryAll(By.css('.kpi-card__valor'));
    expect(valores[0].nativeElement.textContent).toContain('1.500');
    expect(valores[1].nativeElement.textContent).toContain('10');
    expect(valores[2].nativeElement.textContent).toContain('150');
  });

  it('exibe o nome do produto na lista de top produtos', async () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const nome = fixture.debugElement.query(By.css('.top-row__nome'));
    expect(nome.nativeElement.textContent).toContain('X-Burguer');
  });
});
