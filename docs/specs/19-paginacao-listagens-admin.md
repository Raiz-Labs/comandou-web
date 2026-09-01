# Paginação nas listagens de CRUD do admin

- **Issue:** #19 — https://github.com/Raiz-Labs/comandou-web/issues/19
- **Status:** Implemented
- **Repo:** Raiz-Labs/comandou-web (cross-repo: também muda Raiz-Labs/comandou-api)

## Problema

As 4 listagens de CRUD do admin (`produtos`, `categorias`, `mesas`, `usuarios`) carregam a tabela inteira do tenant de uma vez, com busca e filtros aplicados 100% no client (`computed()` sobre o array completo). Com poucos itens funciona bem; com volume maior, o carregamento inicial fica pesado e a busca/filtro escaneia tudo a cada tecla digitada.

**Achado que muda a urgência do problema:** o backend já foi parcialmente corrigido pra isso — o commit `79bc9e5` ("adiciona paginação em listarComandas, listarProdutos e listarTenants") criou um helper genérico (`src/shared/lib/pagination.ts` em `comandou-api`: `parsePagination`/`setPaginationHeaders`, limite padrão 50, máximo 100, total exposto no header `X-Total-Count`) e já aplicou em `GET /produtos`. Só que o `comandou-web` nunca foi atualizado pra consumir isso: `admin.service.ts.listarProdutos()` não manda `page`/`limit` nem lê os headers de total. **Resultado hoje em produção:** qualquer tenant com mais de 50 produtos só enxerga os 50 primeiros no admin, sem nenhuma indicação de que há mais itens nem forma de alcançá-los pela UI — não é um problema futuro de escala, já está truncando silenciosamente.

`categorias`, `mesas` e `usuarios` ainda não têm paginação nenhuma no backend — continuam devolvendo a lista inteira do tenant sem limite.

Além disso, busca e filtros (status/perfil/categoria/ativo) nas 4 telas são hoje filtro client-side sobre a lista carregada inteira. Paginar sem mexer nisso quebraria a busca — um resultado que só existe numa página não carregada simplesmente não apareceria, e o usuário não teria como saber que a busca está incompleta.

## Escopo

**Dentro:**
- **comandou-api** — estender o padrão já usado em `produto.controller.ts`/`produto.service.ts` (helper `parsePagination`/`setPaginationHeaders`) para os outros 3 módulos do admin:
  - `categoria.controller.ts` / `categoria.service.ts` — `listarController`/`listarCategorias` passam a paginar e aceitar busca por `nome`;
  - `mesa.controller.ts` / `mesa.service.ts` — `listarController`/`listarMesas` passam a paginar e aceitar filtro por `status` (campo direto no model `Mesa`, sem precisar de `_count`/relação);
  - `usuario.controller.ts` / `usuario.service.ts` — `listarController`/`listarUsuarios` passam a paginar e aceitar filtro por `perfil` e `ativo`, além de busca por `nome`/`email`;
  - `produto.controller.ts`/`produto.service.ts` — já pagina; só falta adicionar busca por `nome` (hoje só filtra por `categoriaId`) e filtro por `disponivel`, pro frontend poder mandar os mesmos parâmetros que já manda hoje como filtro client-side;
  - Busca usa `contains` + `mode: 'insensitive'` do Prisma (Postgres) — não existe esse padrão em nenhum lugar do código ainda, é novo, mas usa só recurso nativo do Prisma/Postgres, sem dependência nova;
  - Query params de paginação/busca/filtro passam por um schema Zod reutilizável (`schema.safeParse` no controller, mesmo padrão exigido em `.claude/rules/security.md` e já usado pros demais controllers) — cobre os 4 módulos migrados nesta spec. `produto` também passa a validar (hoje não valida `categoriaId`), fechando a mesma classe de gap que a issue #49.
- **comandou-web**:
  - `ApiService.get()` ganha uma variante que lê o response completo (`observe: 'response'`) pra extrair `X-Total-Count` — usada só pelas 4 chamadas de listagem paginada, o resto do `ApiService` continua igual;
  - `admin.service.ts` — os 4 métodos `listar*` passam a aceitar `{ page, busca?, ...filtros }` e devolver `{ items, total }` em vez de array puro;
  - Os 4 componentes (`produtos`, `categorias`, `mesas`, `usuarios`) passam a paginar de verdade: o `resource()` de listagem é refeito a cada mudança de página/busca/filtro (via `computed` nos parâmetros de `resource`, padrão já usado no projeto), com debounce na busca (300ms) pra não disparar uma request por tecla;
  - Novo componente compartilhado `shared/components/pagination` (numeração de página + anterior/próximo) usado pelas 4 telas — evita repetir a mesma UI de paginação 4 vezes;
  - Corrige o corte silencioso do `/produtos`: passa a mostrar quantos itens existem no total e navegação entre páginas.

**Fora:**
- Cache com ETag (sugerido na issue original) — ganho marginal frente ao problema principal (parar de truncar/carregar tudo); vira issue própria se a necessidade for confirmada depois;
- Ordenação customizável pelo usuário (clicar em coluna) — mantém a ordenação fixa que cada service já define (`orderBy` do Prisma);
- Paginação em qualquer endpoint fora dessas 4 telas do admin (comandas, relatórios, cardápio público) — não é o sintoma relatado na issue;
- Migração de schema do banco — nenhuma coluna nova, só mudança de query;
- Infinite scroll / botão "carregar mais" — decisão já tomada por paginação numerada, essas alternativas ficam de fora desta spec.

## Abordagem

**Backend (`comandou-api`):** mesma receita usada no `79bc9e5` pra `produto`, replicada em `categoria`, `mesa` e `usuario`:
```ts
const [items, total] = await Promise.all([
  prisma.<model>.findMany({ where, orderBy, skip, take: limit, include: /* já existente */ }),
  prisma.<model>.count({ where }),
])
return { items, total }
```
com `where` ganhando os filtros novos (busca por `contains`/`insensitive`, `status`/`perfil`/`ativo`/`disponivel` quando presentes na query) e o controller chamando `parsePagination(req.query)` + `setPaginationHeaders(res, ...)`, igual já faz `produto.controller.ts`.

Diferente do que `produto` faz hoje (lê `req.query` direto, sem Zod), os 4 módulos passam a validar a query via `schema.safeParse` antes de chamar `parsePagination`/o service — um schema Zod único e reutilizável (`page`/`limit` como string numérica coercível, `busca` opcional string, filtros específicos de cada módulo como enum/boolean conforme o campo), seguindo o mesmo padrão já usado nos demais controllers do projeto (`.claude/rules/security.md`). `parsePagination` continua fazendo o clamp de `limit`/`page` (min/max), o Zod só garante que o formato bruto da query é válido antes disso.

**Frontend (`comandou-web`):** cada componente já usa `resource()` — a mudança é o `loader` passar a depender de signals de página/busca/filtro (Angular `resource()` já reexecuta o loader quando os signals lidos dentro dele mudam, sem precisar de lógica nova de subscription). Os filtros que hoje são tabs client-side (`filtroDisp`, `filtroStatus`, `filtroPerfil`, `mostrarInativos`) continuam sendo os mesmos signals — só passam a entrar como parâmetro da chamada em vez de argumento de um `.filter()` local. Mudar de página ou filtro reseta pra página 1.

## Resultado da implementação

Dois problemas foram descobertos durante a implementação, corrigidos separadamente (fora desta spec, mas bloqueando parte dela):

- **`mesa.status` nunca era retornado pelo backend** (model `Mesa` não tem essa coluna, `mesa.service.ts` nunca computava) — bug crítico pré-existente, quebrava a tela principal do garçom. Corrigido na issue #54 (branch `fix/54-status-mesa-nao-retornado`, mergeada antes desta); o backend desta spec parte dela. Sem esse fix, o filtro de status de mesa desta spec não teria um campo real pra filtrar.
- **Headers de paginação (`X-Total-Count` etc.) nunca estavam expostos via CORS** (`Access-Control-Expose-Headers` ausente em `app.ts`) — o frontend nunca conseguiria ler `X-Total-Count` entre origens diferentes (o caso normal: front e API em domínios/portas diferentes). Corrigido no mesmo branch do backend desta spec.

Verificado ao vivo com >50 produtos reais (60 inseridos temporariamente, removidos depois): o corte de 50 não existe mais, a paginação numerada navega corretamente entre páginas, contando 60 no total. Busca (produtos) e filtro de status (mesas) confirmados funcionando server-side no browser, sem erros no console.

## Critério de aceite

- [x] Um tenant com mais de 50 produtos consegue ver e navegar até produtos além dos 50 primeiros pelo admin (corrige o corte silencioso atual);
- [x] As 4 listagens (produtos, categorias, mesas, usuários) carregam por página em vez da lista inteira, com controles de paginação numerada visíveis quando há mais de uma página;
- [x] Buscar um termo que só existe em outra página retorna o resultado correto (busca é server-side, não limitada à página já carregada);
- [x] Os filtros existentes (disponível/indisponível, status da mesa, perfil de usuário, mostrar inativos) continuam funcionando, agora aplicados no backend;
- [x] Mudar busca ou filtro reresulta na página 1, não mantém a página anterior mostrando resultado potencialmente vazio;
- [x] Uma página sem itens (busca sem resultado, ou página além do total) mostra estado vazio claro, não erro;
- [x] Teste no backend cobre paginação + busca + filtro em pelo menos um dos módulos migrados (categoria, mesa ou usuario), no mesmo padrão dos testes existentes de `produto`;
- [x] Uma query inválida (ex.: `page`/`limit` não-numérico, `perfil`/`status` fora do enum) retorna 400 via `safeParse`, em vez de cair no `parseInt`/filtro silenciosamente ignorado como hoje;
- [x] Teste no frontend cobre o componente de paginação compartilhado (navegação entre páginas, estado desabilitado no limite).
