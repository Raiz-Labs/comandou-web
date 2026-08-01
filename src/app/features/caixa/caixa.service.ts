import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { Comanda } from '../../shared/types';

export interface FechamentoPayload {
  divisoes?: number;
  ignorarPendentes?: boolean;
}

export interface DivisaoConta {
  comandaId: string;
  total: number;
  partes: number;
  porPessoa: number;
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

  dividirConta(id: string, partes: number): Promise<DivisaoConta> {
    return firstValueFrom(this.api.post<DivisaoConta>(`/comandas/${id}/dividir`, { partes }));
  }
}
