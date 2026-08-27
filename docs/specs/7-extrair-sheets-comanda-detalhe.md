# Extrair sheets e cartão de divisão de conta dos componentes de detalhe de comanda

- **Issue:** #7 — https://github.com/Raiz-Labs/comandou-web/issues/7
- **Status:** Implemented
- **Repo:** Raiz-Labs/comandou-web

## Problema

`ComandaDetalheComponent` (garçom, 1264 linhas) e `ComandaDetalheCaixaComponent` (caixa, 851 linhas) misturam, num único arquivo cada, a lista principal com toda a UI de sheets/cards secundários (seleção de produto, formulário de item, edição, cancelamento, fechamento, divisão de conta). Dentro do próprio `comanda-detalhe.component.ts`, os modos `'form'` (adicionar item) e `'edicao'` (editar item) do sheet duplicam markup e CSS quase idênticos (`.form-body`, `.qty-control`, `.preco-produto`, `.subtotal`). Isso torna qualquer mudança num fluxo secundário (ex.: ajustar o form de adicionar item) arriscada de revisar e testar isoladamente, porque tudo compartilha o mesmo arquivo e os mesmos signals de estado do componente pai.

## Escopo

**Dentro:**
- Extrair do `ComandaDetalheComponent` (garçom) três sheets hoje controlados pelo signal `uiStep` (`'picker' | 'form' | 'edicao'`) em componentes standalone próprios: seleção de produto, formulário de adicionar item, formulário de editar item;
- Extrair do `ComandaDetalheCaixaComponent` (caixa) o cartão de divisão de conta (`divisoes`, `valorPorPessoa`) em um componente standalone próprio;
- Componentes recebem dados via `input()` e comunicam decisões via `output()` — toda chamada de API (`garcomService`/`caixaService`) e o `resource()` de `comanda` continuam no componente pai;
- Consolidar o CSS do form duplicado (`.form-body`, `.qty-control`, `.preco-produto`, `.subtotal` etc.) num único lugar, eliminando a duplicação hoje existente dentro do próprio `comanda-detalhe.component.ts` entre os modos `'form'` e `'edicao'`;
- Manter a lógica de revalidação de estado hoje em `confirmarEdicao`/`pedirCancelamento` (guarda contra item desatualizado via WebSocket) no componente pai — ela depende do `resource()` da comanda, que não migra —, sem mudar o comportamento;
- Dividir os testes existentes (`comanda-detalhe.component.spec.ts`, `comanda-detalhe-caixa.component.spec.ts`) acompanhando a extração, mantendo a cobertura atual dos casos de revalidação e update otimista.

**Fora:**
- Qualquer service de fachada (facade) para centralizar os computeds — não existe precedente desse padrão no repo hoje; os computeds simplesmente migram junto com o componente que os usa;
- Qualquer forma de "múltiplos métodos de pagamento" — não existe entidade de pagamento no domínio (`Comanda`/`ItemComanda` em `shared/types/index.ts` não têm isso) nem essa tela hoje; o único mecanismo existente é dividir o total igualmente por N pessoas, e é só isso que sai extraído (sem inventar seleção de método de pagamento);
- Mudança de comportamento visível ao usuário — layout, textos, validações e regras de negócio permanecem idênticos; é uma extração estrutural, não uma reescrita de fluxo;
- Mexer em `MesaComandasComponent` ou `ComandasListaComponent` — fora do escopo desta issue.

## Abordagem

Seguindo a convenção de nomes do repo (componentes de feature em português: `ComandaDetalheComponent`, `FilaComponent`, `CardapioComponent`), os novos componentes standalone ficam em `src/app/features/garcom/comanda/` e `src/app/features/caixa/comanda/`, ao lado do componente pai (sem pasta `shared/`, já que são específicos de feature — regra do CLAUDE.md):

- `seletor-produto.component.ts` (garçom) — recebe `cardapio` (lista de `Produto`) e `categorias` via `input()`, emite `produtoSelecionado` via `output()`. Substitui o modo `'picker'` de `uiStep` e a lógica de `busca`/`categoriaSelecionada`.
- `formulario-item.component.ts` (garçom) — recebe `produto: Produto` (modo adicionar) ou `item: ItemComanda` (modo editar) via `input()`, encapsula `quantidade`/`observacao`/`incrementarQtd`/`decrementarQtd`, emite `confirmado` com o payload e `cancelado`. Cobre os modos `'form'` e `'edicao'` de `uiStep`, que hoje reusam os mesmos signals — um único componente parametrizado pelo input evita duplicar o form.
- `divisao-conta.component.ts` (caixa) — recebe o total da comanda via `input()`, encapsula `divisoes`/`valorPorPessoa`, emite `divisaoConfirmada` com o número de partes. Mantém o nome fiel ao que a tela faz hoje (dividir a conta), sem introduzir o termo "pagamento" que a issue original sugeria e que não corresponde a nenhuma entidade real.

`ComandaDetalheComponent` e `ComandaDetalheCaixaComponent` passam a ser orquestradores: mantêm `resource()`, chamadas de service, `ConfirmDialogComponent` de cancelamento/fechamento, e alternam qual sub-componente mostrar com base no estado local — a revalidação de item desatualizado via WS (guarda hoje em `confirmarEdicao`/`pedirCancelamento`) segue sendo responsabilidade de quem chama o service, então permanece no pai, que é quem tem o `resource()` da comanda.

O CSS duplicado do form vira um único bloco de estilos dentro do novo componente que unifica os modos `'form'`/`'edicao'`, não uma classe utilitária global nem um novo componente "shell de sheet" — não há necessidade concreta identificada de compartilhar isso além do garçom.

## Critério de aceite

- [x] `ComandaDetalheComponent` não contém mais a lógica de busca/filtro de cardápio (`busca`, `categoriaSelecionada`, `produtosFiltrados`, `categoriasFiltradas`) — isso vive em `SeletorProdutoComponent`; o signal `uiStep` permanece no pai, deliberadamente, só pra decidir qual sub-componente renderizar;
- [x] Adicionar item, editar item e selecionar produto continuam funcionando de ponta a ponta (via `garcomService`) com o mesmo comportamento observável de hoje, incluindo o reset de estado ao fechar o sheet;
- [x] A guarda de revalidação (item mudou de status via WS entre abrir e confirmar a edição) continua coberta por teste após a extração — mesmo caso, arquivo(s) de teste podem mudar;
- [x] `DivisaoContaComponent` encapsula o controle de incremento/decremento da divisão (a UI do cartão "Dividir conta"); o pai mantém sua própria cópia de `divisoes`/`valorPorPessoa`, sincronizada via `(divisoesChange)`, porque `resumo-card`, `pedirFechamento`, `executarFechamento` e `mensagemConfirmacao` ainda precisam desse valor — e `pedirFechamento`/`executarFechamento` continuam chamando `caixaService.dividirConta`/`fecharComanda` com o mesmo payload de hoje;
- [x] Nenhum novo texto ou termo relacionado a "método de pagamento" aparece na UI ou no código — a divisão continua sendo só por número de pessoas;
- [x] CSS do form (`.form-body`, `.qty-control`, `.preco-produto`, `.subtotal`) não está mais duplicado entre os modos `'form'` e `'edicao'`;
- [x] `comanda-detalhe.component.ts` e `comanda-detalhe-caixa.component.ts` ficam significativamente menores (ordem de poucas centenas de linhas cada, não mais os ~1200/~850 atuais);
- [x] Suite de testes existente (`comanda-detalhe.component.spec.ts`, `comanda-detalhe-caixa.component.spec.ts`) passa, dividida entre o componente pai e os novos sub-componentes conforme o que cada teste exercita.
