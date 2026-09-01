import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService, Pagina } from '../../core/api/api.service';
import {
  Categoria,
  Mesa,
  Produto,
  RelatorioVendas,
  Usuario,
  Comanda,
  Perfil,
  StatusMesa,
} from '../../shared/types';

// Descarta undefined/vazio antes de virar query param — evita mandar
// ?categoriaId=undefined ou ?busca= pro backend.
const toQueryParams = (params: object): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') out[key] = String(value);
  }
  return out;
};

export interface ListarProdutosParams {
  page?: number;
  limit?: number;
  busca?: string;
  categoriaId?: string;
  disponivel?: boolean;
}

export interface ListarCategoriasParams {
  page?: number;
  limit?: number;
  busca?: string;
}

export interface ListarMesasParams {
  page?: number;
  limit?: number;
  busca?: string;
  status?: StatusMesa;
}

export interface ListarUsuariosParams {
  page?: number;
  limit?: number;
  busca?: string;
  perfil?: Perfil;
  ativo?: boolean;
}

export interface DashboardResumo {
  relatorio: RelatorioVendas;
  mesas: Mesa[];
  comandasAbertas: Comanda[];
}

export interface CriarProdutoPayload {
  nome: string;
  descricao?: string;
  preco: number;
  categoriaId: string;
  estoque: number;
  disponivel: boolean;
}

export interface CriarCategoriaPayload {
  nome: string;
  ordem: number;
}

export interface CriarMesaPayload {
  numero: number;
  descricao?: string;
}

export interface CriarUsuarioPayload {
  nome: string;
  email: string;
  senha: string;
  perfil: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly api = inject(ApiService);

  // ===== Dashboard =====
  buscarDashboard(): Promise<DashboardResumo> {
    return Promise.all([
      firstValueFrom(this.api.get<RelatorioVendas>('/relatorios/vendas?periodo=hoje')),
      firstValueFrom(this.api.get<Mesa[]>('/mesas')),
      firstValueFrom(this.api.get<Comanda[]>('/comandas?aberta=true')),
    ]).then(([relatorio, mesas, comandasAbertas]) => ({ relatorio, mesas, comandasAbertas }));
  }

  // ===== Produtos =====
  listarProdutos(params: ListarProdutosParams = {}): Promise<Pagina<Produto>> {
    return firstValueFrom(this.api.getPaged<Produto>('/produtos', toQueryParams(params)));
  }

  criarProduto(payload: CriarProdutoPayload): Promise<Produto> {
    return firstValueFrom(this.api.post<Produto>('/produtos', payload));
  }

  editarProduto(id: string, payload: Partial<CriarProdutoPayload>): Promise<Produto> {
    return firstValueFrom(this.api.patch<Produto>(`/produtos/${id}`, payload));
  }

  ajustarEstoque(
    id: string,
    tipo: 'entrada' | 'saida',
    quantidade: number
  ): Promise<{ estoqueAtual: number }> {
    return firstValueFrom(
      this.api.patch<{ estoqueAtual: number }>(`/produtos/${id}/estoque`, { tipo, quantidade })
    );
  }

  excluirProduto(id: string): Promise<void> {
    return firstValueFrom(this.api.delete<void>(`/produtos/${id}`));
  }

  // ===== Categorias =====
  listarCategorias(params: ListarCategoriasParams = {}): Promise<Pagina<Categoria>> {
    return firstValueFrom(this.api.getPaged<Categoria>('/categorias', toQueryParams(params)));
  }

  criarCategoria(payload: CriarCategoriaPayload): Promise<Categoria> {
    return firstValueFrom(this.api.post<Categoria>('/categorias', payload));
  }

  editarCategoria(id: string, payload: Partial<CriarCategoriaPayload>): Promise<Categoria> {
    return firstValueFrom(this.api.patch<Categoria>(`/categorias/${id}`, payload));
  }

  excluirCategoria(id: string): Promise<void> {
    return firstValueFrom(this.api.delete<void>(`/categorias/${id}`));
  }

  // ===== Mesas =====
  listarMesas(params: ListarMesasParams = {}): Promise<Pagina<Mesa>> {
    return firstValueFrom(this.api.getPaged<Mesa>('/mesas', toQueryParams(params)));
  }

  criarMesa(payload: CriarMesaPayload): Promise<Mesa> {
    return firstValueFrom(this.api.post<Mesa>('/mesas', payload));
  }

  editarMesa(id: string, payload: Partial<CriarMesaPayload>): Promise<Mesa> {
    return firstValueFrom(this.api.patch<Mesa>(`/mesas/${id}`, payload));
  }

  excluirMesa(id: string): Promise<void> {
    return firstValueFrom(this.api.delete<void>(`/mesas/${id}`));
  }

  // ===== Usuários =====
  listarUsuarios(params: ListarUsuariosParams = {}): Promise<Pagina<Usuario>> {
    return firstValueFrom(this.api.getPaged<Usuario>('/usuarios', toQueryParams(params)));
  }

  criarUsuario(payload: CriarUsuarioPayload): Promise<Usuario> {
    return firstValueFrom(this.api.post<Usuario>('/usuarios', payload));
  }

  editarUsuario(id: string, payload: Partial<CriarUsuarioPayload>): Promise<Usuario> {
    return firstValueFrom(this.api.patch<Usuario>(`/usuarios/${id}`, payload));
  }

  toggleUsuarioAtivo(id: string, ativo: boolean): Promise<Usuario> {
    return firstValueFrom(this.api.patch<Usuario>(`/usuarios/${id}`, { ativo }));
  }

  // ===== Relatórios =====
  buscarRelatorio(periodo: 'hoje' | '7dias' | '30dias'): Promise<RelatorioVendas> {
    return firstValueFrom(
      this.api.get<RelatorioVendas>(`/relatorios/vendas?periodo=${periodo}`)
    );
  }
}
