# CI fase 1: pipeline em estágios com testes, cobertura e relatório

- **Issue:** #68 — https://github.com/Raiz-Labs/comandou-web/issues/68
- **Status:** Implemented (PRs #79 e #80; em produção pelo release #82, 19/11/2026)
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

- [x] Um PR para a `dev` mostra os checks `quality`, `test`, `security`, `build` e `report`.
- [x] O job `test` roda o `ng test`, e um teste que falha propositalmente deixa `test` e `report` vermelhos. Validar num commit temporário, revertido antes do merge.
- [x] O PR recebe **um** comentário fixo do relatório, editado a cada push, e um comentário de cobertura.
- [x] Subir um `coverageThresholds` para 99 num commit temporário faz o `test` falhar. O commit é revertido antes do merge.
- [x] Um budget estourado (ex.: `initial` com `maximumError: 1kB` num commit temporário) faz o `build` falhar.
- [x] **Vercel:**
  - [x] o check exigido é `report`, e "Lint · Typecheck · Build" foi removido (painel conferido depois de recarregar, em 19/11/2026);
  - [x] com o `report` verde, promove;
  - [~] um release com o `report` vermelho **não** promove o deploy de produção. **Verificado de forma indireta:** no release #82 o status da Vercel passou por "Waiting for checks to complete" e só concluiu 3 s depois de o CI terminar. Testar com `report` vermelho exigiria mandar um release quebrado para a `main`;
  - ~~Registrar com print no PR 2~~ registrado pelo histórico de status do commit `494a229` (ver "Evidências").
- [x] ~~O artefato `coverage-web`~~ O artefato **`test-results-web`** (junit + resumo de cobertura) fica disponível no run por 7 dias. Ver "Desvios".

### Evidências da validação (19/11/2026)
- **Checks, comentários e artefato:** #80, com 1 comentário de relatório, 1 de cobertura e o artefato `test-results-web` expirando em 26/11.
- **Teste quebrado:** PR temporário #81 (fechado sem merge). `test`, "Testes (junit)" e `report` ❌, `build` pulado.
- **Mínimo de cobertura:** PR temporário #85 (`lines: 99`, fechado sem merge). `test` ❌ e `report` ❌, `build` pulado.
- **Budget:** PR temporário #86 (`maximumError: 1kB`, fechado sem merge). `build` ❌ e `report` ❌.
- **Vercel no release #82** (commit `494a229`):
  | Horário | Status |
  |---|---|
  | 14:13:22 | "deploying your app" |
  | 14:13:56 | "Waiting for checks to complete" |
  | 14:14:34 | CI da `main` verde |
  | 14:14:37 | "Deployment has completed" |

### Desvios da spec
- **Um artefato em vez de `coverage-web`.** Foi implementado `test-results-web`, com junit e resumo de cobertura. O job `report` baixa um único artefato.
- **Sem cache de `.angular/cache` no `build`.** O `ng build` leva cerca de 6 s, então o cache não compensa a configuração e a chave a manter. Fica descartado até o build ficar lento de verdade.

## Questões em aberto

- ~~Confirmar se os Deployment Checks estão disponíveis no plano atual da Vercel.~~ **Confirmado em 19/11/2026** no painel (plano Hobby):
  - **Onde fica:** Settings → Build and Deployment → **Deployment Checks**, sem selo de Pro. Recursos vizinhos, como Rolling Releases, pedem Pro.
  - **Como importar o check:** "Add Checks" → GitHub → "Select checks to add" → "Show All Checks". O painel lista os checks do último commit da `main`; hoje aparece só "Lint · Typecheck · Build".
  - **Quando configurar:** o check provisório "Lint · Typecheck · Build" foi configurado em 19/11/2026. A troca para `report` segue o passo 3 da sequência de PRs. Se o check exigido não existir (job renomeado ou ainda não criado), a promoção de produção fica parada esperando um check que nunca chega.
  - **O que não usar:** o step `vercel/repository-dispatch/actions/status` que o painel sugere não é necessário, porque o check do GitHub Actions é importado direto. Evita mais uma action de terceiros.

## Resultado da implementação

- **PR 1 (#79): estágios.**
  - `quality` ‖ `test` ‖ `security` → `build`, com uma composite action `.github/actions/setup`. O `npm audit signatures` tenta até 3 vezes.
  - **Os 159 testes passaram a rodar no CI.**
  - **Problema que já existia, exposto no primeiro run:**
    - **Sintoma:** os 9 testes do `socket.service.spec` falhavam no runner (2 CPUs) e passavam em máquina com mais CPUs.
    - **Causa:** o `vi.mock('socket.io-client')` não vale quando outro spec já carregou o módulo real no mesmo worker.
    - **Reprodução:** `docker run --cpuset-cpus=0,1 node:22`.
    - **Correção:** o `SocketService` passou a receber o `io` pelo `InjectionToken` `SOCKET_IO` (por padrão, o `io` real), e o spec injeta o fake via provider.
- **PR 2 (este): cobertura e relatório.**
  - **Dependência nova:** `@vitest/coverage-v8` 4.1.12, a mesma versão do `vitest`.
  - **`angular.json` (`test.options`):**
    - `coverageInclude: src/**/*.ts`;
    - `coverageExclude: src/**/*.spec.ts`;
    - `coverageReporters`: `text-summary`, `json-summary` e `json`;
    - **catraca medida em 19/11/2026:** statements 56, branches 61, functions 38, lines 58.
  - **Por que a catraca fica nos números atuais:** a cobertura do web é bem menor que a da api (funções em 38,83%), porque há muitos componentes sem teste. A catraca só impede que ela caia; aumentar é trabalho de outras issues.
  - **Gate validado:** com `lines: 99` num teste local temporário, o `ng test --coverage` termina com código 1.
  - **CI:**
    - `ng test --watch=false --coverage --reporters=junit --reporters=default --output-file=reports/junit.xml`. O `--output-file` vale para o primeiro reporter, por isso o junit vem antes.
    - Comentário de cobertura (`davelosert`, apontando para `coverage/comandou-web/`) e artefato `test-results-web` de 7 dias.
    - Job `report` igual ao da api#71, sem a linha de deploy.
    - O `report` é o check que a Vercel vai exigir.
