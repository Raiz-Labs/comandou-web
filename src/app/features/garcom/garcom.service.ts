import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import { Categoria, Comanda, Mesa, AdicionarItemPayload, ItemComanda, Produto } from '../../shared/types';

@Injectable({ providedIn: 'root' })
export class GarcomService {
  private readonly api = inject(ApiService);

  // limit: '100' (o máximo aceito pelo backend) — sem isso, o default de
  // paginação (50) cortaria mesas/categorias silenciosamente em tenants
  // maiores, exatamente o bug que a paginação do admin (#19) corrigiu lá.
  listarMesas(): Promise<Mesa[]> {
    return firstValueFrom(this.api.get<Mesa[]>('/mesas', { limit: '100' }));
  }

  buscarMesa(id: string): Promise<Mesa> {
    return firstValueFrom(this.api.get<Mesa>(`/mesas/${id}`));
  }

  listarComandasDaMesa(mesaId: string): Promise<Comanda[]> {
    return firstValueFrom(this.api.get<Comanda[]>(`/mesas/${mesaId}/comandas`));
  }

  abrirComanda(mesaId: string, nomeCliente?: string): Promise<Comanda> {
    const payload: Record<string, unknown> = { mesaId };
    if (nomeCliente?.trim()) payload['nomeCliente'] = nomeCliente.trim();
    return firstValueFrom(this.api.post<Comanda>('/comandas', payload));
  }

  buscarComanda(id: string): Promise<Comanda> {
    return firstValueFrom(this.api.get<Comanda>(`/comandas/${id}`));
  }

  listarCategorias(): Promise<Categoria[]> {
    return firstValueFrom(this.api.get<Categoria[]>('/categorias', { limit: '100' }));
  }

  listarProdutosDisponiveis(): Promise<Produto[]> {
    return firstValueFrom(
      this.api.get<Produto[]>('/produtos', { disponivel: 'true', limit: '100' }),
    );
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

  fecharComanda(id: string, ignorarPendentes = false): Promise<void> {
    return firstValueFrom(this.api.post<void>(`/comandas/${id}/fechar`, { ignorarPendentes }));
  }
}
