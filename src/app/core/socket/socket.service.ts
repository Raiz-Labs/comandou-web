import { effect, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { authState } from '../auth/auth.signal';
import { WsEvent } from '../../shared/types';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket | null = null;

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
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
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
    this.connectionStatus.set('disconnected');
  }

  on<T>(event: WsEvent): Observable<T> {
    return new Observable<T>((observer) => {
      this.socket?.on(event, (data: T) => observer.next(data));
      return () => {
        this.socket?.off(event);
      };
    });
  }

  emit(event: string, data?: unknown): void {
    this.socket?.emit(event, data);
  }
}
