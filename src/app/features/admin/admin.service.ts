import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api/api.service';
import {
  Categoria,
  Mesa,
  Produto,
  RelatorioVendas,
  Usuario,
  Comanda,
} from '../../shared/types';

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
  listarProdutos(): Promise<Produto[]> {
    return firstValueFrom(this.api.get<Produto[]>('/produtos'));
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
  listarCategorias(): Promise<Categoria[]> {
    return firstValueFrom(this.api.get<Categoria[]>('/categorias'));
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
  listarMesas(): Promise<Mesa[]> {
    return firstValueFrom(this.api.get<Mesa[]>('/mesas'));
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
  listarUsuarios(): Promise<Usuario[]> {
    return firstValueFrom(this.api.get<Usuario[]>('/usuarios'));
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
