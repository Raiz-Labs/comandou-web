import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SocketService } from '../../../core/socket/socket.service';

export interface ItemProntoNotificacao {
  /** ID único da notificação (≠ itemId — pode chegar duplicado via WS) */
  notifId: string;
  itemId: string;
  produtoNome: string;
  mesaNumero?: number;
  /** ID da comanda para navegar ao detalhe */
  comandaId?: string;
  criadoEm: Date;
}

/** Formato esperado do payload do evento item:atualizado vindo do WebSocket */
interface ItemAtualizadoWs {
  id: string;
  status: string;
  produto?: { nome?: string };
  comanda?: {
    id?: string;
    mesa?: { numero?: number };
  };
}

@Injectable({ providedIn: 'root' })
export class GarcomNotificacaoService implements OnDestroy {
  private readonly socket = inject(SocketService);
  private sub: Subscription | null = null;

  private readonly _notificacoes = signal<ItemProntoNotificacao[]>([]);

  /** Lista de notificações pendentes, mais recentes primeiro */
  readonly notificacoes = computed(() => this._notificacoes());

  constructor() {
    this.sub = this.socket.on<ItemAtualizadoWs>('item:atualizado').subscribe(evento => {
      if (evento?.status !== 'pronto') return;

      const notif: ItemProntoNotificacao = {
        notifId: crypto.randomUUID(),
        itemId: evento.id,
        produtoNome: evento.produto?.nome ?? 'Item',
        mesaNumero: evento.comanda?.mesa?.numero,
        comandaId: evento.comanda?.id,
        criadoEm: new Date(),
      };

      // Evita duplicatas para o mesmo item
      this._notificacoes.update(lista => {
        const jaExiste = lista.some(n => n.itemId === notif.itemId);
        if (jaExiste) return lista;
        return [notif, ...lista];
      });
    });
  }

  dispensar(notifId: string): void {
    this._notificacoes.update(lista => lista.filter(n => n.notifId !== notifId));
  }

  dispensarTodas(): void {
    this._notificacoes.set([]);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
