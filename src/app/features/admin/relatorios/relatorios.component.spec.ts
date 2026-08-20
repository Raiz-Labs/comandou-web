import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import {
  LUCIDE_ICONS,
  LucideIconProvider,
  ArrowLeft,
  BarChart2,
  DivideCircle,
  Receipt,
  RefreshCw,
  TrendingUp,
  WifiOff,
} from 'lucide-angular';
import { RelatoriosComponent } from './relatorios.component';
import { AdminService } from '../admin.service';
import { RelatorioVendas } from '../../../shared/types';

const makeRelatorio = (overrides: Partial<RelatorioVendas> = {}): RelatorioVendas => ({
  resumo: { totalVendas: 1500, totalComandas: 10, ticketMedio: 150 },
  vendasPorDia: [
    { data: '2024-01-01', total: 500 },
    { data: '2024-01-02', total: 1000 },
  ],
  topProdutos: [
    { id: '1', nome: 'X-Burguer', quantidade: 8, total: 800 },
    { id: '2', nome: 'Fritas', quantidade: 5, total: 250 },
  ],
  ...overrides,
});

const LUCIDE_PROVIDERS = [
  {
    provide: LUCIDE_ICONS,
    multi: true,
    useValue: new LucideIconProvider({
      ArrowLeft,
      BarChart2,
      DivideCircle,
      Receipt,
      RefreshCw,
      TrendingUp,
      WifiOff,
    }),
  },
];

describe('RelatoriosComponent', () => {
  let adminServiceMock: {
    buscarRelatorio: ReturnType<typeof vi.fn>;
  };
  let routerMock: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    adminServiceMock = {
      buscarRelatorio: vi.fn().mockResolvedValue(makeRelatorio()),
    };
    routerMock = { navigateByUrl: vi.fn() };

    TestBed.configureTestingModule({
      imports: [RelatoriosComponent],
      providers: [
        { provide: AdminService, useValue: adminServiceMock },
        { provide: Router, useValue: routerMock },
        ...LUCIDE_PROVIDERS,
      ],
    });
  });

  it('não importa chart.js nem ng2-charts — usa apenas CSS para os gráficos', async () => {
    const fixture = TestBed.createComponent(RelatoriosComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    // Verifica que o componente renderiza sem erros usando o gráfico CSS nativo
    const chartArea = fixture.debugElement.query(By.css('.chart-area'));
    expect(chartArea).toBeTruthy();

    // Colunas de barra renderizadas para cada dia
    const barCols = fixture.debugElement.queryAll(By.css('.bar-col'));
    expect(barCols.length).toBe(2);
  });

  it('exibe os KPIs corretamente com os dados do serviço', async () => {
    const fixture = TestBed.createComponent(RelatoriosComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const valores = fixture.debugElement.queryAll(By.css('.kpi-card__valor'));
    expect(valores.length).toBe(3);
    // totalVendas formatado como moeda BR
    expect(valores[0].nativeElement.textContent).toContain('1.500');
    // totalComandas
    expect(valores[1].nativeElement.textContent).toContain('10');
    // ticketMedio formatado como moeda BR
    expect(valores[2].nativeElement.textContent).toContain('150');
  });

  it('exibe a tabela de top produtos quando há dados', async () => {
    const fixture = TestBed.createComponent(RelatoriosComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const linhas = fixture.debugElement.queryAll(By.css('.top-row'));
    expect(linhas.length).toBe(2);
    expect(linhas[0].nativeElement.textContent).toContain('X-Burguer');
    expect(linhas[1].nativeElement.textContent).toContain('Fritas');
  });

  it('exibe estado vazio quando não há comandas no período', async () => {
    adminServiceMock.buscarRelatorio.mockResolvedValue(
      makeRelatorio({
        resumo: { totalVendas: 0, totalComandas: 0, ticketMedio: 0 },
        vendasPorDia: [],
        topProdutos: [],
      }),
    );

    const fixture = TestBed.createComponent(RelatoriosComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const semDados = fixture.debugElement.query(By.css('.sem-dados'));
    expect(semDados).toBeTruthy();
    expect(semDados.nativeElement.textContent).toContain('Sem dados para este período');
  });

  it('exibe estado de erro e botão de retry quando o serviço falha', async () => {
    adminServiceMock.buscarRelatorio.mockRejectedValue(new Error('network error'));

    const fixture = TestBed.createComponent(RelatoriosComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const emptyState = fixture.debugElement.query(By.css('.empty-state'));
    expect(emptyState).toBeTruthy();
    expect(emptyState.nativeElement.textContent).toContain('Erro ao carregar o relatório');

    const retryBtn = fixture.debugElement.query(By.css('.empty-state button.b-btn-secondary'));
    expect(retryBtn).toBeTruthy();
    expect(retryBtn.nativeElement.textContent).toContain('Tentar novamente');
  });

  it('o botão voltar navega para /admin/dashboard', async () => {
    const fixture = TestBed.createComponent(RelatoriosComponent);
    fixture.detectChanges();

    const voltarBtn = fixture.debugElement.query(By.css('.b-btn-back'));
    voltarBtn.nativeElement.click();

    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('os três botões de período estão presentes', async () => {
    const fixture = TestBed.createComponent(RelatoriosComponent);
    fixture.detectChanges();

    const periodoBtns = fixture.debugElement.queryAll(By.css('.periodo-btn'));
    expect(periodoBtns.length).toBe(3);
    const textos = periodoBtns.map(b => b.nativeElement.textContent.trim());
    expect(textos).toContain('Hoje');
    expect(textos).toContain('Últimos 7 dias');
    expect(textos).toContain('Últimos 30 dias');
  });

  it('ao clicar em outro período, recarrega os dados do serviço', async () => {
    adminServiceMock.buscarRelatorio.mockResolvedValue(makeRelatorio());

    const fixture = TestBed.createComponent(RelatoriosComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const periodoBtns = fixture.debugElement.queryAll(By.css('.periodo-btn'));
    // Clica em "Últimos 7 dias"
    periodoBtns[1].nativeElement.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(adminServiceMock.buscarRelatorio).toHaveBeenCalledWith('7dias');
  });
});
