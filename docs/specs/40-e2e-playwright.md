# Configurar testes e2e com Playwright

- **Issue:** #40 — https://github.com/Raiz-Labs/comandou-web/issues/40
- **Status:** Implemented
- **Repo:** Raiz-Labs/comandou-web

## Problema

O projeto não tem nenhuma infraestrutura de teste e2e. Existem testes unitários/de componente via Vitest (`ng test`, `src/**/*.spec.ts`), mas o CI atual (`.github/workflows/ci.yml`) só roda `lint` → `typecheck` → `build` — nem esses testes unitários são executados automaticamente hoje. Não há Playwright, Cypress, pasta `e2e/` nem `playwright.config.ts`.

**Nota da análise de código:** o repo tem `.claude/skills/angular-developer/references/e2e-testing.md`, mas esse arquivo descreve o setup de e2e do **próprio monorepo do Angular** (Cypress, pasta `devtools/`, `ng-devtools-mcp`) — não tem nenhuma relação com o comandou-web. Não deve ser usado como referência de convenção deste projeto.

## Escopo

**Dentro:**
- Instalar e configurar `@playwright/test` (`playwright.config.ts`, `testDir: e2e/`);
- Scripts npm (`test:e2e`, `test:e2e:ui`);
- Fixture de autenticação reutilizável por perfil (`admin`, `caixa`, `garcom`, `cozinha`), usando os usuários do seed de `comandou-api` (`scripts/seed.ts`: `admin@burguer.com`/`caixa@burguer.com`/`garcom@burguer.com`/`cozinha@burguer.com`, senha `123456`, tenant `burguer-test`);
- Primeiro teste real (`e2e/login.spec.ts`), provando que o setup funciona de ponta a ponta: login com sucesso, login com credenciais inválidas, redirecionamento pós-login pro home de cada perfil;
- `.gitignore` atualizado (`.auth/`, `playwright-report/`, `test-results/`);
- Documentação mínima de como rodar localmente (pré-requisito: `comandou-api` rodando + `npm run seed` lá).

**Fora:**
- Rodar e2e no CI do GitHub Actions — exigiria subir `comandou-api` + Postgres no pipeline do `comandou-web` (orquestração cross-repo), é uma decisão de infra maior, separada desta issue;
- Cobertura completa de todas as telas do app — esta issue estabelece a fundação + 1 fluxo (login); os demais fluxos (comandas, cozinha, admin, fluxo de caixa) são follow-ups incrementais;
- Testes e2e no `comandou-api` — o backend já tem testes de integração (Vitest + Supertest) cobrindo isso, não precisa de Playwright;
- Mockar a API — e2e sempre roda contra `comandou-api` real, nunca contra uma versão fake/mockada (senão não estaria testando a integração de verdade).

## Abordagem

- `e2e/` na raiz do repo (não em `src/`) — evita ser pego por `tsconfig.app.json`/`ng test` (Vitest), que já cobre os testes unitários e de componente.
- `playwright.config.ts`: `webServer` aponta pro `ng serve` (`baseURL: http://localhost:4200`, comando `npm start`, reaproveita o servidor se já estiver rodando). **Não** sobe `comandou-api` — isso é uma precondição externa documentada, igual ao que já é necessário para testar a UI manualmente hoje.
- **Autenticação**: o JWT vive só em memória (`authState` signal, `core/auth/auth.signal.ts`) — nunca em `localStorage`/`sessionStorage` (regra de segurança do projeto) — mas o refresh token é um cookie `httpOnly`, e `authInitializer` (`APP_INITIALIZER`) já faz o refresh silencioso ao carregar a página. Isso encaixa bem com o mecanismo nativo do Playwright de `storageState` (que persiste cookies, não estado JS): um `e2e/auth.setup.ts` faz login real pela UI uma vez por perfil, salva `e2e/.auth/<perfil>.json`, e os specs reaproveitam via `test.use({ storageState: 'e2e/.auth/<perfil>.json' })` — sem refazer login em cada teste, e sem inventar um atalho que a arquitetura do app não usa (não dá pra só injetar o JWT via `localStorage`, ele nunca fica lá).
- Tenant: login em `/login?tenant=burguer-test` (mesmo mecanismo de `resolverSlugPuro` em `environment.ts`, já usado manualmente pra testar a tela de fluxo de caixa).
- `e2e/login.spec.ts`: reaproveita o form real (`E-mail`/`Senha`/`Entrar`) de `features/login/login.component.ts` — sem seletores novos inventados, usar `getByLabel`/`getByRole` do Playwright contra o DOM que já existe.

## Critério de aceite

- [x] `npx playwright test` roda localmente contra `ng serve` + `comandou-api` local (seed aplicado), sem erro de configuração;
- [x] Fixture/setup de login por perfil salva e reaproveita `storageState` — os testes não refazem login do zero a cada spec;
- [x] Teste cobre: login com credenciais válidas de `caixa` redireciona pra `/caixa/comandas` (home do perfil);
- [x] Teste cobre: login com credenciais inválidas mostra a mensagem "E-mail ou senha inválidos." e permanece em `/login`;
- [x] `npm run test:e2e` documentado (`CLAUDE.md` ou `README.md`) como comando padrão, incluindo o pré-requisito de ter `comandou-api` rodando com seed aplicado;
- [x] Nenhum teste e2e roda contra API mockada — todas as chamadas passam pelo `comandou-api` real rodando local.

## Questões em aberto

1. Quando (e como) rodar e2e no CI é resolvido — quem/o quê sobe `comandou-api` + Postgres no pipeline do `comandou-web`?
2. Qual a granularidade dos próximos specs e2e — um arquivo por perfil, ou um por fluxo de negócio (ex: "abrir e fechar comanda", "fluxo de caixa")?
3. Screenshot/vídeo em falha de teste — guardar como artifact, e onde, quando o CI for resolvido?
4. **Achado durante a implementação**: `authRateLimiter` (comandou-api) limita `/auth/login`+`/auth/refresh` a 5 req/min por IP, sem bypass pra e2e (só existe `skip` pra `NODE_ENV === 'test'`, usado pelo Vitest da própria API). `auth.setup.ts` sozinho já consome as 5 chamadas permitidas — qualquer teste adicional que logue de novo precisa esperar a janela zerar. Resolvido por ora com uma espera fixa de ~61s (`e2e/rate-limit-cooldown.setup.ts`, projeto `cooldown` entre `setup` e `chromium` no `playwright.config.ts`) — suíte fica ~1min mais lenta a cada roda. Se a suíte crescer, vale revisitar: pedir um bypass no `authRateLimiter` pro comandou-api é a solução de raiz.
