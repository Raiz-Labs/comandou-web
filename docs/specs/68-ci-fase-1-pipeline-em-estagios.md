# CI fase 1: pipeline em estágios com testes, cobertura e relatório

- **Issue:** #68 — https://github.com/Raiz-Labs/comandou-web/issues/68
- **Status:** In progress (PR 1: estágios)
- **Repo:** Raiz-Labs/comandou-web
- **Plano:** `docs/PLANO-PIPELINES-CI.md` (fase 1)
- **Par na api:** Raiz-Labs/comandou-api#71
- **Depende de:** #67
- **Próxima fase:** #69

## Problema

O CI (`ci.yml`, job "Lint · Typecheck · Build") roda `npm run lint`, `npm run typecheck` e `npm run build`. Faltam três coisas:
- **Testes.** Ele não roda os testes unitários: os ~160 testes do `ng test` (builder `@angular/build:unit-test`, Vitest 4) só rodam na máquina de quem lembra de rodar.
- **Cobertura.** Não há cobertura. O `@vitest/coverage-v8` nem está instalado.
- **Relatório.** O PR não recebe nenhum resumo.

**A produção não espera o CI.** A Vercel publica a `main` pela integração Git (`vercel.json` com `buildCommand: ng build`) sem esperar o CI. Um release com teste quebrado vai para produção do mesmo jeito.

## Escopo

**Dentro:**
- **Composite action** local `.github/actions/setup/action.yml`: `setup-node` (Node 22, `cache: npm`) + `npm ci`.
- **Jobs:**
  - `quality`: `npm run lint` e `npm run typecheck`.
  - `test`: `npx ng test --watch=false --coverage`.
  - `security`: `npm audit --audit-level=high` e `npm audit signatures`. Saem do job de qualidade criado na #67.
  - `build`: `npm run build`, com os budgets atuais (`initial` 500 kB/1 MB, `anyComponentStyle` 8 kB/16 kB) e cache de `.angular/cache`.
  - `report`: `if: always()`.
- **Cobertura:**
  - instalar `@vitest/coverage-v8` na **mesma versão do `vitest`**;
  - no `angular.json`, em `test.options`, configurar `coverageReporters` (`text`, `json-summary`, `json`) e `coverageThresholds`. O valor de cada threshold é **o medido no PR, arredondado para baixo**.
- **Comentário de cobertura no PR:** `davelosert/vitest-coverage-report-action`, apontando para o `json-summary` gerado.
- **Job `report`:** igual ao da api#71, sem a linha de deploy.
  - tabela de estágios no `$GITHUB_STEP_SUMMARY`;
  - comentário fixo (`marocchino/sticky-pull-request-comment`, `header: ci-report`);
  - falha se algum estágio falhar.
- **Artefatos:** cobertura com `retention-days: 7`.
- **Vercel:** ativar **Deployment Checks** exigindo o check `report`, para que o deploy de produção só seja promovido com o CI verde.

**Fora:**
- e2e Playwright no CI (api#75).
- Ferramentas novas de análise: knip, jscpd, BundleMon etc. (#69).
- Trocar a integração Git da Vercel por deploy via Actions.
- Mudanças na api.

## Abordagem

### Sequência de PRs
Cada PR sai da `dev` e volta por PR para a `dev`.
1. **`ci/fase-1-estagios`**: composite action, jobs `quality`/`test`/`security`/`build`, com o `ng test` ainda sem cobertura. **A partir daqui os testes rodam no CI.**
2. **`ci/fase-1-cobertura-relatorio`**: `@vitest/coverage-v8`, `coverageReporters`/`coverageThresholds` medidos, comentário de cobertura, job `report` e artefatos.
3. **Vercel: trocar o check exigido**, no release da fase 1, **antes do merge** do PR `dev → main`.
   - **Situação atual:** desde 19/11/2026 os Deployment Checks já exigem **"Lint · Typecheck · Build"**, configurados como proteção provisória.
   - **Por que a ordem importa:** a fase 1 remove esse job. Se ele continuar exigido, o deploy de produção do release fica esperando para sempre.
   - **Passo a passo:**
     1. Settings → Build and Deployment → Deployment Checks → "Add Checks" → GitHub → "Select checks to add";
     2. no campo "Enter a GitHub SHA", colar o SHA da `dev` (que já tem o job `report`);
     3. marcar `report` e clicar em Add;
     4. remover "Lint · Typecheck · Build" no menu `⋯`;
     5. só então mergear o release.

### Detalhes
- **Saída da cobertura.** O caminho do `json-summary` é `coverage/comandou-web/` (padrão do builder). Conferir na primeira execução e passar o caminho para a action com `json-summary-path`/`json-final-path`.
- **Thresholds e o comentário.** A action de cobertura lê thresholds do *vite config*. Como aqui eles ficam no `angular.json`, o comentário não mostra o indicador de mínimo. O gate continua valendo, porque o `ng test` falha abaixo do mínimo.
- **Junit.** O builder `unit-test` aceita `reporters`. Se `junit` funcionar, publicar com `mikepenz/action-junit-report`, igual à api. Senão, fica fora desta fase e o resultado aparece pelo log e pelo status do job.
- **Permissões por job:**
  - `quality`, `security` e `build`: `contents: read`;
  - `test`: `contents: read` + `pull-requests: write`;
  - `report`: `contents: read`, `actions: read` e `pull-requests: write` (mais `checks: write` se o junit entrar).
- **Nomes dos jobs:** são estáveis (`quality`, `test`, `security`, `build`, `report`). A Vercel exige o check pelo nome.

## Critério de aceite

- [ ] Um PR para a `dev` mostra os checks `quality`, `test`, `security`, `build` e `report`.
- [ ] O job `test` roda o `ng test`, e um teste que falha propositalmente deixa `test` e `report` vermelhos. Validar num commit temporário, revertido antes do merge.
- [ ] O PR recebe **um** comentário fixo do relatório, editado a cada push, e um comentário de cobertura.
- [ ] Subir um `coverageThresholds` para 99 num commit temporário faz o `test` falhar. O commit é revertido antes do merge.
- [ ] Um budget estourado (ex.: `initial` com `maximumError: 1kB` num commit temporário) faz o `build` falhar.
- [ ] **Vercel:**
  - o check exigido é `report`, e "Lint · Typecheck · Build" foi removido;
  - um release com o `report` vermelho **não** promove o deploy de produção;
  - com o `report` verde, promove.
  - Registrar com print no PR 2.
- [ ] O artefato `coverage-web` fica disponível no run por 7 dias.

## Questões em aberto

- ~~Confirmar se os Deployment Checks estão disponíveis no plano atual da Vercel.~~ **Confirmado em 19/11/2026** no painel (plano Hobby):
  - **Onde fica:** Settings → Build and Deployment → **Deployment Checks**, sem selo de Pro. Recursos vizinhos, como Rolling Releases, pedem Pro.
  - **Como importar o check:** "Add Checks" → GitHub → "Select checks to add" → "Show All Checks". O painel lista os checks do último commit da `main`; hoje aparece só "Lint · Typecheck · Build".
  - **Quando configurar:** o check provisório "Lint · Typecheck · Build" foi configurado em 19/11/2026. A troca para `report` segue o passo 3 da sequência de PRs. Se o check exigido não existir (job renomeado ou ainda não criado), a promoção de produção fica parada esperando um check que nunca chega.
  - **O que não usar:** o step `vercel/repository-dispatch/actions/status` que o painel sugere não é necessário, porque o check do GitHub Actions é importado direto. Evita mais uma action de terceiros.
