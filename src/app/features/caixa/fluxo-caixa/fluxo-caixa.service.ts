import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import {
  MovimentacaoFinanceira,
  OrigemMovimentacao,
  ResumoFluxoCaixa,
  TipoMovimentacao,
} from '../../../shared/types';

export interface FiltrosFluxoCaixa {
  dataInicial?: string;
  dataFinal?: string;
  tipo?: TipoMovimentacao;
  categoria?: string;
  origem?: OrigemMovimentacao;
  formaPagamento?: string;
  usuarioId?: string;
}

export interface RegistrarMovimentacaoPayload {
  valor: number;
  categoria: string;
  descricao: string;
  formaPagamento?: string;
}

function toParams(filtros: FiltrosFluxoCaixa): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filtros).filter(([, valor]) => valor !== undefined && valor !== '')
  ) as Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class FluxoCaixaService {
  private readonly api = inject(ApiService);

  obterResumo(filtros: FiltrosFluxoCaixa): Promise<ResumoFluxoCaixa> {
    return firstValueFrom(
      this.api.get<ResumoFluxoCaixa>('/fluxo-caixa/resumo', toParams(filtros))
    );
  }

  listarMovimentacoes(filtros: FiltrosFluxoCaixa): Promise<MovimentacaoFinanceira[]> {
    return firstValueFrom(
      this.api.get<MovimentacaoFinanceira[]>('/fluxo-caixa/movimentacoes', toParams(filtros))
    );
  }

  obterMovimentacao(id: string): Promise<MovimentacaoFinanceira> {
    return firstValueFrom(
      this.api.get<MovimentacaoFinanceira>(`/fluxo-caixa/movimentacoes/${id}`)
    );
  }

  registrarEntrada(payload: RegistrarMovimentacaoPayload): Promise<MovimentacaoFinanceira> {
    return firstValueFrom(
      this.api.post<MovimentacaoFinanceira>('/fluxo-caixa/movimentacoes/entrada', payload)
    );
  }

  registrarSaida(payload: RegistrarMovimentacaoPayload): Promise<MovimentacaoFinanceira> {
    return firstValueFrom(
      this.api.post<MovimentacaoFinanceira>('/fluxo-caixa/movimentacoes/saida', payload)
    );
  }

  estornarMovimentacao(id: string): Promise<MovimentacaoFinanceira> {
    return firstValueFrom(
      this.api.post<MovimentacaoFinanceira>(`/fluxo-caixa/movimentacoes/${id}/estornar`)
    );
  }
}
