// Tipos compartilhados — espelhando modelos do backend

export type Perfil = 'garcom' | 'cozinha' | 'caixa' | 'admin';

export type StatusItem =
  | 'pendente'
  | 'em_preparo'
  | 'pronto'
  | 'entregue'
  | 'cancelado';

export type StatusMesa = 'livre' | 'ocupada' | 'item_pronto';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
}

export interface AuthState {
  user: Usuario | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface Mesa {
  id: string;
  numero: number;
  descricao?: string;
  status: StatusMesa;
}

export interface Categoria {
  id: string;
  nome: string;
  ordem: number;
}

export interface Produto {
  id: string;
  nome: string;
  descricao?: string;
  preco: number;
  categoriaId: string;
  categoria?: Categoria;
  estoque: number;
  disponivel: boolean;
  imagemUrl?: string;
}

export interface ItemComanda {
  id: string;
  produtoId: string;
  produto?: Produto;
  quantidade: number;
  observacao?: string;
  status: StatusItem;
  preco: number;
  total: number;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Comanda {
  id: string;
  mesaId: string;
  mesa?: Mesa;
  itens: ItemComanda[];
  total: number;
  aberta: boolean;
  criadoEm: string;
  fechadoEm?: string;
}

export interface RelatorioVendas {
  totalVendas: number;
  totalComandas: number;
  ticketMedio: number;
  vendasPorDia: { data: string; total: number }[];
  topProdutos: { produto: string; quantidade: number; total: number }[];
}

// Payloads de API
export interface LoginPayload {
  email: string;
  senha: string;
}

export interface LoginResponse {
  token: string;
  user: Usuario;
}

export interface AdicionarItemPayload {
  produtoId: string;
  quantidade: number;
  observacao?: string;
}

// WebSocket events
export type WsEvent =
  | 'item:novo'
  | 'item:atualizado'
  | 'item:cancelado'
  | 'comanda:aberta'
  | 'comanda:fechada';
