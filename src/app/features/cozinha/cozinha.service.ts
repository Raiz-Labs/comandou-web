import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { ItemComanda } from '../../shared/types';

/** ItemComanda enriquecido com dados de comanda e mesa para a fila da cozinha */
export interface ItemFila extends ItemComanda {
  comandaId: string;
  comanda: {
    id: string;
    mesaId: string;
    mesa?: { numero: number };
  };
}

@Injectable({ providedIn: 'root' })
export class CozinhaService {
  private readonly api = inject(ApiService);

  listarFila(): Promise<ItemFila[]> {
    return firstValueFrom(this.api.get<ItemFila[]>('/cozinha/fila'));
  }

  marcarEmPreparo(comandaId: string, itemId: string): Promise<ItemComanda> {
    return firstValueFrom(
      this.api.patch<ItemComanda>(`/comandas/${comandaId}/itens/${itemId}/status`, {
        status: 'em_preparo',
      })
    );
  }

  marcarPronto(comandaId: string, itemId: string): Promise<ItemComanda> {
    return firstValueFrom(
      this.api.patch<ItemComanda>(`/comandas/${comandaId}/itens/${itemId}/status`, {
        status: 'pronto',
      })
    );
  }
}
