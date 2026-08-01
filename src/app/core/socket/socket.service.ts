import { effect, Injectable, signal } from '@angular/core';
import { Observable, share } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { authState } from '../auth/auth.signal';
import { WsEvent } from '../../shared/types';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;
  // Um Observable compartilhado por evento — evita registrar um handler novo
  // no socket a cada subscriber e garante que cancelar UM subscriber nunca
  // derruba os outros (share() só desregistra quando o último sai).
  private readonly eventStreams = new Map<WsEvent, Observable<unknown>>();

  readonly connectionStatus = signal<ConnectionStatus>('disconnected');

  constructor() {
    // Conecta/desconecta automaticamente conforme estado de autenticação
    effect(() => {
      const { isAuthenticated, token } = authState();
      if (isAuthenticated && token) {
        this.connect(token);
      } else {
        this.disconnect();
      }
    });
  }

  private connect(token: string): void {
    if (this.socket?.connected) return;

    this.socket = io(environment.wsUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      // Limitado (não Infinity) — evita tempestade de reconexão em escala;
      // ~10 tentativas com teto de 60s cobre quedas de rede razoáveis.
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 60000,
    });

    this.socket.on('connect', () => {
      this.connectionStatus.set('connected');
    });

    this.socket.on('disconnect', () => {
      this.connectionStatus.set('disconnected');
    });

    this.socket.on('reconnecting', () => {
      this.connectionStatus.set('reconnecting');
    });

    this.socket.on('reconnect', () => {
      this.connectionStatus.set('connected');
    });
  }

  private disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.eventStreams.clear();
    this.connectionStatus.set('disconnected');
  }

  on<T>(event: WsEvent): Observable<T> {
    let stream = this.eventStreams.get(event);
    if (!stream) {
      stream = new Observable<T>((observer) => {
        const handler = (data: T) => observer.next(data);
        this.socket?.on(event, handler);
        return () => {
          this.socket?.off(event, handler);
          this.eventStreams.delete(event);
        };
      }).pipe(share());
      this.eventStreams.set(event, stream);
    }
    return stream as Observable<T>;
  }

  emit(event: string, data?: unknown): void {
    this.socket?.emit(event, data);
  }
}
