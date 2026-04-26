import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { Comanda } from '../../shared/types';

export interface FechamentoPayload {
  divisoes?: number; // número de pessoas para divisão
}

@Injectable({ providedIn: 'root' })
export class CaixaService {
  private readonly api = inject(ApiService);

  listarComandasAbertas(): Promise<Comanda[]> {
    return firstValueFrom(this.api.get<Comanda[]>('/comandas?aberta=true'));
  }

  buscarComanda(id: string): Promise<Comanda> {
    return firstValueFrom(this.api.get<Comanda>(`/comandas/${id}`));
  }

  fecharComanda(id: string, payload: FechamentoPayload = {}): Promise<Comanda> {
    return firstValueFrom(this.api.post<Comanda>(`/comandas/${id}/fechar`, payload));
  }
}
