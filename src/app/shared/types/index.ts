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
  nomeCliente?: string | null;
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

export type TipoMovimentacao = 'entrada' | 'saida';
export type OrigemMovimentacao = 'manual' | 'automatica';
export type StatusMovimentacao = 'ativa' | 'estornada';

export interface MovimentacaoFinanceira {
  id: string;
  tipo: TipoMovimentacao;
  origem: OrigemMovimentacao;
  status: StatusMovimentacao;
  valor: number;
  categoria: string;
  descricao?: string | null;
  formaPagamento?: string | null;
  ocorridaEm: string;
  comandaId?: string | null;
  usuarioId: string;
  estornadaEm?: string | null;
  comanda?: { id: string; total: number; mesa: { numero: number } } | null;
}

export interface ResumoFluxoCaixa {
  saldoInicial: number;
  totalEntradas: number;
  totalSaidas: number;
  saldoAtual: number;
  quantidade: number;
}

// Payloads de API
export interface LoginPayload {
  email: string;
  senha: string;
}

export interface LoginResponse {
  accessToken: string;
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
