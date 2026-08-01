import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RelogioService } from './relogio.service';

describe('RelogioService', () => {
  let service: RelogioService;

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    TestBed.configureTestingModule({ providers: [RelogioService] });
    service = TestBed.inject(RelogioService);
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('mantém um único interval mesmo com múltiplos assinantes registrados', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    const cancelar1 = service.registrar();
    const cancelar2 = service.registrar();
    const cancelar3 = service.registrar();

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    cancelar1();
    cancelar2();
    cancelar3();
  });

  it('atualiza horaAtual a cada segundo enquanto houver ao menos um assinante', () => {
    const cancelar = service.registrar();
    const antes = service.horaAtual();

    vi.advanceTimersByTime(1000);

    expect(service.horaAtual()).not.toBe(antes);
    cancelar();
  });

  it('para o interval quando o último assinante se desregistra', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const cancelar1 = service.registrar();
    const cancelar2 = service.registrar();

    cancelar1();
    expect(clearIntervalSpy).not.toHaveBeenCalled();

    cancelar2();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it('não reinicia o interval se um novo assinante chega enquanto outros ainda estão ativos', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const cancelar1 = service.registrar();
    const cancelar2 = service.registrar();

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    cancelar1();
    cancelar2();
  });

  it('pausa o interval quando a aba fica oculta e retoma (com refresh imediato) ao voltar', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const cancelar = service.registrar();
    setIntervalSpy.mockClear();

    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    cancelar();
  });
});
