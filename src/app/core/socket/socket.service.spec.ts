import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { io } from 'socket.io-client';
import { SocketService } from './socket.service';
import { authState, clearAuth, setAuth } from '../auth/auth.signal';
import { Usuario } from '../../shared/types';

const usuario: Usuario = { id: '1', nome: 'Ana', email: 'ana@test.com', perfil: 'admin', ativo: true };

class FakeSocket {
  connected = true;
  private handlers = new Map<string, Set<(...args: unknown[]) => void>>();

  on(event: string, handler: (...args: unknown[]) => void): this {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return this;
  }

  off(event: string, handler?: (...args: unknown[]) => void): this {
    const set = this.handlers.get(event);
    if (!set) return this;
    if (handler) set.delete(handler);
    else set.clear();
    return this;
  }

  emitFromServer(event: string, data?: unknown): void {
    this.handlers.get(event)?.forEach((h) => h(data));
  }

  listenerCount(event: string): number {
    return this.handlers.get(event)?.size ?? 0;
  }

  disconnect(): void {
    this.connected = false;
  }

  emit(): void {}
}

let fakeSocket: FakeSocket;

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    fakeSocket = new FakeSocket();
    return fakeSocket;
  }),
}));

describe('SocketService', () => {
  let service: SocketService;

  beforeEach(() => {
    clearAuth();
    TestBed.configureTestingModule({ providers: [SocketService] });
    service = TestBed.inject(SocketService);
  });

  afterEach(() => {
    clearAuth();
    TestBed.resetTestingModule();
  });

  it('conecta ao autenticar e desconecta ao limpar o auth', () => {
    setAuth('token-1', usuario);
    TestBed.flushEffects();
    expect(fakeSocket).toBeDefined();
    expect(fakeSocket.connected).toBe(true);
    expect(service.connectionStatus()).toBe('disconnected'); // só muda no evento 'connect' do socket real

    clearAuth();
    TestBed.flushEffects();
    expect(authState().token).toBeNull();
  });

  it('dois subscribers no mesmo evento recebem os dados de forma independente', () => {
    setAuth('token-1', usuario);
    TestBed.flushEffects();

    const recebido1: unknown[] = [];
    const recebido2: unknown[] = [];
    const sub1 = service.on<{ id: string }>('item:novo').subscribe((d) => recebido1.push(d));
    const sub2 = service.on<{ id: string }>('item:novo').subscribe((d) => recebido2.push(d));

    fakeSocket.emitFromServer('item:novo', { id: 'a' });

    expect(recebido1).toEqual([{ id: 'a' }]);
    expect(recebido2).toEqual([{ id: 'a' }]);

    sub1.unsubscribe();
    sub2.unsubscribe();
  });

  it('cancelar UMA subscription não derruba as outras do mesmo evento', () => {
    setAuth('token-1', usuario);
    TestBed.flushEffects();

    const recebido2: unknown[] = [];
    const sub1 = service.on('item:novo').subscribe(() => {});
    const sub2 = service.on<{ id: string }>('item:novo').subscribe((d) => recebido2.push(d));

    sub1.unsubscribe();
    fakeSocket.emitFromServer('item:novo', { id: 'b' });

    expect(recebido2).toEqual([{ id: 'b' }]);
    sub2.unsubscribe();
  });

  it('só desregistra o listener do socket quando o último subscriber sai — sem vazamento', () => {
    setAuth('token-1', usuario);
    TestBed.flushEffects();

    const sub1 = service.on('item:novo').subscribe(() => {});
    const sub2 = service.on('item:novo').subscribe(() => {});
    expect(fakeSocket.listenerCount('item:novo')).toBe(1);

    sub1.unsubscribe();
    expect(fakeSocket.listenerCount('item:novo')).toBe(1);

    sub2.unsubscribe();
    expect(fakeSocket.listenerCount('item:novo')).toBe(0);
  });

  it('nova subscription após todas saírem volta a registrar um listener limpo e funcional', () => {
    setAuth('token-1', usuario);
    TestBed.flushEffects();

    const sub1 = service.on('item:novo').subscribe(() => {});
    sub1.unsubscribe();
    expect(fakeSocket.listenerCount('item:novo')).toBe(0);

    const recebido: unknown[] = [];
    const sub2 = service.on<{ id: string }>('item:novo').subscribe((d) => recebido.push(d));
    fakeSocket.emitFromServer('item:novo', { id: 'c' });
    expect(recebido).toEqual([{ id: 'c' }]);
    sub2.unsubscribe();
  });

  it('eventos de tipos diferentes não interferem entre si', () => {
    setAuth('token-1', usuario);
    TestBed.flushEffects();

    const novos: unknown[] = [];
    const atualizados: unknown[] = [];
    const sub1 = service.on('item:novo').subscribe((d) => novos.push(d));
    const sub2 = service.on('item:atualizado').subscribe((d) => atualizados.push(d));

    fakeSocket.emitFromServer('item:novo', { id: 'x' });
    fakeSocket.emitFromServer('item:atualizado', { id: 'y' });

    expect(novos).toEqual([{ id: 'x' }]);
    expect(atualizados).toEqual([{ id: 'y' }]);

    sub1.unsubscribe();
    sub2.unsubscribe();
  });

  it('configura reconexão com tentativas limitadas e teto de backoff de 60s', () => {
    setAuth('token-1', usuario);
    TestBed.flushEffects();

    const options = vi.mocked(io).mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(options['reconnectionAttempts']).toBe(10);
    expect(options['reconnectionDelayMax']).toBe(60000);
  });
});
