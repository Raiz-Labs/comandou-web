# Tipo RelatorioVendas não bate com a resposta real da API

- **Issue:** #43 — https://github.com/Raiz-Labs/comandou-web/issues/43
- **Status:** Implemented
- **Repo:** Raiz-Labs/comandou-web

## Problema

`GET /relatorios/vendas` (usado por `AdminService.buscarDashboard()` e pela tela de relatórios) devolve os totais aninhados em `resumo` e o nome do produto no campo `nome`. O tipo `RelatorioVendas` (`shared/types/index.ts:78`) declara esses campos como se estivessem no nível raiz do objeto e usa `produto` em vez de `nome`. Como não existe contrato de tipo compartilhado entre `comandou-api` e `comandou-web`, o TypeScript não pega esse descompasso — compila normal e só se manifesta em runtime, silenciosamente: os campos lidos ficam `undefined`, sem erro no console.

Efeito visível pro usuário: em `/admin/dashboard` e `/admin/relatorios`, os cards "Receita hoje"/"Total em vendas", "Comandas fechadas" e "Ticket médio" aparecem vazios ou "—" (o `CurrencyBrPipe` mostra "—" pra `null`/`undefined`), e a lista "Top produtos" perde o nome do produto — mesmo quando existem vendas reais no período. Só os campos que por coincidência têm o mesmo nome nos dois lados (`quantidade`, `total` de cada produto, e `vendasPorDia`) continuam funcionando, o que torna o bug mais difícil de notar de primeira — a tela parece "quase certa".

## Escopo

**Dentro:**
- Corrigir `RelatorioVendas` em `shared/types/index.ts` pra refletir o formato real devolvido por `comandou-api` (`resumo: { totalVendas, totalComandas, ticketMedio }` aninhado; `topProdutos[].nome` em vez de `.produto`);
- Ajustar os dois componentes que leem esse tipo — `dashboard.component.ts` (linhas 67, 77, 87, 130) e `relatorios.component.ts` (linhas 99, 107, 115, 156) — pra acessar `resumo.totalVendas`/`resumo.totalComandas`/`resumo.ticketMedio` e `topProdutos[].nome`;
- Teste (unitário de componente ou snapshot) que injeta uma resposta mockada no formato real da API (aninhado, com `nome`) e verifica que os valores aparecem corretamente renderizados — pra evitar que o mock do teste repita o mesmo erro de forma que o teste "passe" com o bug presente.

**Fora:**
- Criar um contrato de tipo compartilhado/gerado entre `comandou-api` e `comandou-web` (ex.: OpenAPI, pacote de tipos comum) — resolveria a classe inteira de bug, mas é uma mudança de infraestrutura maior, não o escopo deste fix pontual;
- Mudar o formato de resposta da API (`comandou-api`, `relatorio.service.ts`) — o formato aninhado com `resumo` já é usado/testado lá; o fix é do lado que está lendo errado;
- Qualquer outro card ou tela do admin não listada acima (ex.: `vendasPorDia`, que já lê os campos certos e não é afetado).

## Abordagem

Ajustar a fonte da verdade (`RelatorioVendas` em `shared/types/index.ts`) pra bater com o shape real de `relatorio.service.ts` (`comandou-api`), depois seguir os erros de tipo que o `tsc` vai apontar nos dois componentes consumidores — a mudança de tipo por si só localiza os pontos exatos que precisam de `.resumo.` e `.nome`, já que o build vai quebrar em cada uso incorreto.

Como os dois repositórios não compartilham tipos, não há como o TypeScript garantir essa consistência de forma automática nesta correção — fica registrado como possível melhoria futura (contrato compartilhado), fora do escopo aqui.

## Critério de aceite

- [x] `RelatorioVendas` em `shared/types/index.ts` declara `resumo: { totalVendas: number; totalComandas: number; ticketMedio: number }` e `topProdutos: { id: string; nome: string; quantidade: number; total: number }[]`, batendo com o retorno de `relatorio.service.ts`;
- [x] Em `/admin/dashboard`, com pelo menos uma comanda fechada no dia, os cards "Receita hoje", "Comandas fechadas" e "Ticket médio" mostram os valores reais (não "—" nem vazio), e a lista "Top produtos hoje" mostra o nome do produto;
- [x] Em `/admin/relatorios`, o mesmo vale pros cards "Total em vendas", "Comandas fechadas", "Ticket médio" e pra lista "Top produtos", em qualquer período selecionado (hoje/7 dias/30 dias);
- [x] `npm run typecheck` passa sem erros após o ajuste dos dois componentes;
- [x] Teste cobre o cenário com resposta mockada no formato aninhado real da API (não no formato achatado antigo) e falha se algum campo voltar a ser lido do nível errado.
