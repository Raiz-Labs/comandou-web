# Tela de fluxo de caixa

- **Issue:** #38 — https://github.com/Raiz-Labs/comandou-web/issues/38
- **Status:** Implemented
- **Repo:** Raiz-Labs/comandou-web

## Problema

O Comandou! não tem uma tela onde o perfil `caixa` ou `admin` consigam ver o saldo do estabelecimento, lançar movimentações manuais (reforços, retiradas, despesas) e consultar o histórico financeiro. Hoje essa informação não é visível em lugar nenhum do produto, mesmo a API já expondo tudo isso (`comandou-api`, módulo `fluxo-caixa`, mergeado em `main`).

## Escopo

**Dentro:**
- Tela de fluxo de caixa com resumo: saldo inicial do período, total de entradas, total de saídas, saldo atual, quantidade de movimentações — via `GET /fluxo-caixa/resumo`;
- Formulário de lançamento manual de entrada (`POST /fluxo-caixa/movimentacoes/entrada`) e de saída (`POST /fluxo-caixa/movimentacoes/saida`): `valor`, `categoria`, `descricao` (ambos obrigatórios — a API rejeita com 400 se ausentes), `formaPagamento` e `ocorridaEm` opcionais;
- Validação de campos obrigatórios no formulário, com indicação clara de erro por campo (Signal Forms);
- Listagem de movimentações (`GET /fluxo-caixa/movimentacoes`), paginada via os headers `X-Total-Count`/`X-Page`/`X-Limit`/`X-Total-Pages` que a API já retorna — sem reimplementar paginação;
- Filtros enviados como query params reais pro backend (`dataInicial`, `dataFinal`, `tipo`, `categoria`, `origem`, `formaPagamento`, `usuarioId`) — a API já os aceita todos combinados;
- Detalhe de uma movimentação (`GET /fluxo-caixa/movimentacoes/:id`), incluindo `comanda` (`{ id, total, mesa: { numero } }`) quando a movimentação for `origem: 'automatica'`;
- Ação de estornar movimentação (`POST /fluxo-caixa/movimentacoes/:id/estornar`) — **só visível/habilitada para perfil `admin`**, pois a API já bloqueia `caixa` com 403 nessa rota;
- Acesso à tela liberado para `caixa` e `admin` (`perfilGuard(['caixa', 'admin'])`); `garcom`/`cozinha` nunca veem a rota;
- Valores monetários formatados com `CurrencyBrPipe` já existente (`{{ valor | currencyBr }}`); datas formatadas inline com `toLocaleDateString('pt-BR', ...)`, mesmo padrão de `relatorios.component.ts`.

**Fora:**
- Cálculo de saldo, geração automática de entrada por comanda, prevenção de duplicidade e regra de estorno — tudo isso já está pronto e testado na API (`comandou-api#41`, `#42`); o frontend só exibe o que a API retorna, não recalcula nada;
- Exportação em PDF/Excel — ver "Questões em aberto";
- Abertura/fechamento diário de caixa como fluxo de UI — a API não modela isso (fluxo de caixa é contínuo por tenant, sem esse conceito hoje);
- Relatórios ou dashboards financeiros além do resumo desta tela — isso é `admin/relatorios`, módulo já existente e separado.

## Abordagem

Estrutura de arquivos segue o padrão de `features/caixa/comandas/` (não `admin/relatorios/`, que não tem service dedicado) — nova feature `features/caixa/fluxo-caixa/`:
- `fluxo-caixa.service.ts` (`@Injectable({ providedIn: 'root' })`): `obterResumo(filtros)`, `listarMovimentacoes(filtros)`, `obterMovimentacao(id)`, `registrarEntrada(dto)`, `registrarSaida(dto)`, `estornarMovimentacao(id)` — todos `firstValueFrom(this.api.<verb>(...))`, mesmo formato de `CaixaService`.
- `fluxo-caixa-lista.component.ts` (tela principal): resumo no topo + listagem filtrável abaixo + botão de nova movimentação.
- Filtros como `signal<FiltrosFluxoCaixa>({})`, com `effect()` chamando `resource.reload()` a cada mudança — mesmo padrão de `periodo` em `relatorios.component.ts` (é a única tela hoje que já manda filtro pro backend via query string).
- `protected readonly resumo = resource({ loader: () => this.fluxoCaixaService.obterResumo(this.filtros()) })` e o mesmo para a listagem.
- Rota nova em `app.routes.ts`, dentro de `path: 'caixa'` (que já usa `perfilGuard(['caixa', 'admin'])`): `{ path: 'fluxo-caixa', loadComponent: () => ... }`.
- Botão "Estornar" no detalhe da movimentação só renderiza se `authState().perfil === 'admin'` — evita expor uma ação que a API vai rejeitar com 403 de qualquer forma para `caixa`.
- Confirmação de estorno via `<app-confirm-dialog [confirmDanger]="true">`, mesmo padrão usado para fechar comanda em `comanda-detalhe-caixa.component.ts`; `ToastService.success('Movimentação estornada.')` / `.danger(...)` após a chamada resolver.
- Novos tipos em `shared/types/index.ts` (mesmo arquivo, mesmo estilo flat-interface das entidades existentes):
  ```ts
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
  ```

## Critério de aceite

- [x] Usuário `caixa` ou `admin`, ao acessar `/caixa/fluxo-caixa`, vê saldo inicial, entradas, saídas, saldo atual e o histórico do período selecionado (dados de `GET /fluxo-caixa/resumo` e `GET /fluxo-caixa/movimentacoes`);
- [x] Usuário `garcom`/`cozinha` é redirecionado pelo `perfilGuard` ao tentar acessar `/caixa/fluxo-caixa` diretamente pela URL;
- [x] Preencher e confirmar o formulário de entrada manual chama `POST /fluxo-caixa/movimentacoes/entrada` e atualiza o saldo exibido;
- [x] Preencher e confirmar o formulário de saída manual chama `POST /fluxo-caixa/movimentacoes/saida` e deduz do saldo exibido;
- [x] Tentar confirmar um lançamento sem `categoria` ou `descricao`, ou com `valor` ≤ 0, é bloqueado no cliente pelo Signal Forms antes de chamar a API (e também exibe o erro 400 da API caso o cliente deixe passar algo);
- [x] Aplicar filtros (`dataInicial`/`dataFinal`, `tipo`, `categoria`, `origem`, `formaPagamento`, `usuarioId`) refaz a chamada com os query params correspondentes e atualiza a listagem;
- [x] Selecionar uma movimentação abre o detalhe completo; se `origem: 'automatica'`, mostra o vínculo com a comanda (`comanda.mesa.numero`, `comanda.total`);
- [x] Botão de estornar só aparece para perfil `admin`; ao confirmar, chama `POST /fluxo-caixa/movimentacoes/:id/estornar`, atualiza o saldo exibido e mantém a movimentação original visível na listagem com indicação de "estornada";
- [x] Valores são exibidos via `CurrencyBrPipe` (`R$ 0,00`); datas via `toLocaleDateString('pt-BR', ...)`.

## Questões em aberto

1. Exportação em PDF/Excel é necessária nesta primeira versão ou fica para depois?
2. Há um range máximo de período que o usuário pode consultar, ou a busca é livre desde o início dos registros?
3. O fluxo deve separar visualmente valores em dinheiro dos pagamentos eletrônicos (`formaPagamento`)?
4. Taxa de serviço e descontos aparecem como linhas separadas na tela de detalhe? (A API não modela isso separadamente hoje — o `valor` da entrada automática já é o total líquido da comanda.)
