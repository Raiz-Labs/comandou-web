import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { Comanda, Mesa, AdicionarItemPayload, ItemComanda } from '../../shared/types';

@Injectable({ providedIn: 'root' })
export class GarcomService {
  private readonly api = inject(ApiService);

  listarMesas(): Promise<Mesa[]> {
    return firstValueFrom(this.api.get<Mesa[]>('/mesas'));
  }

  buscarMesa(id: string): Promise<Mesa> {
    return firstValueFrom(this.api.get<Mesa>(`/mesas/${id}`));
  }

  listarComandasDaMesa(mesaId: string): Promise<Comanda[]> {
    return firstValueFrom(this.api.get<Comanda[]>(`/mesas/${mesaId}/comandas`));
  }

  abrirComanda(mesaId: string): Promise<Comanda> {
    return firstValueFrom(this.api.post<Comanda>('/comandas', { mesaId }));
  }

  buscarComanda(id: string): Promise<Comanda> {
    return firstValueFrom(this.api.get<Comanda>(`/comandas/${id}`));
  }

  adicionarItem(comandaId: string, payload: AdicionarItemPayload): Promise<ItemComanda> {
    return firstValueFrom(
      this.api.post<ItemComanda>(`/comandas/${comandaId}/itens`, payload)
    );
  }

  editarItem(
    comandaId: string,
    itemId: string,
    payload: Partial<AdicionarItemPayload>
  ): Promise<ItemComanda> {
    return firstValueFrom(
      this.api.patch<ItemComanda>(`/comandas/${comandaId}/itens/${itemId}`, payload)
    );
  }

  cancelarItem(comandaId: string, itemId: string): Promise<void> {
    return firstValueFrom(
      this.api.delete<void>(`/comandas/${comandaId}/itens/${itemId}`)
    );
  }
}
