# CI fase 0: endurecer workflows e cadeia de suprimentos

- **Issue:** #67 — https://github.com/Raiz-Labs/comandou-web/issues/67
- **Status:** In progress (PR 1: #70, PR 2: este)
- **Repo:** Raiz-Labs/comandou-web
- **Plano:** `docs/PLANO-PIPELINES-CI.md` (fase 0), na pasta raiz do Comandou
- **Par na api:** Raiz-Labs/comandou-api#70
- **Depende de:** #66 mergeado (CI rodando em PRs para a `dev`)
- **Próxima fase:** #68

## Problema

O `.github/workflows/ci.yml` (job "Lint · Typecheck · Build") tem três problemas:
- usa `actions/checkout@v4` e `actions/setup-node@v4` **por tag mutável**, e essas majors dependem do runtime Node 20, que saiu dos runners em 23/09/2026;
- não declara `permissions:`, `concurrency` nem `timeout-minutes`;
- não há Dependabot configurado.

**Dependências vulneráveis.** Medido em 18/11/2026, `npm audit` acusa **3 críticas e 24 altas**:
- críticas: `piscina`, `proxy-addr` e `tar`;
- altas: inclui pacotes diretos do Angular (`@angular/core`, `@angular/common`, `@angular/router`, `@angular/build`, `@angular/cli`, `@angular/compiler`).

Todas têm correção compatível, sem troca de major.

## Escopo

**Dentro:**
- **Actions:** majors atuais, com **todo `uses:` de terceiros pinado por SHA de 40 caracteres** e a versão em comentário.
- **Permissões:** `permissions: contents: read` no topo do workflow.
- **`concurrency`:** cancela o run anterior **apenas em PR**.
- **`timeout-minutes: 15`** no job.
- **Dependabot:** `.github/dependabot.yml` com `npm` e `github-actions`, `groups` (minor/patch) e `cooldown: 5 dias`. No `npm`, um grupo próprio `angular` (`@angular/*` e `@angular-eslint/*`) para atualizar o framework de uma vez.
- **Correção das vulnerabilidades:** `npm audit fix` (sem `--force`) para zerar as altas e críticas.
- **Auditoria no CI:** step novo com `npm audit --audit-level=high` e `npm audit signatures`. Sem `--omit=dev`, porque quase tudo no Angular é build-time e vai parar no bundle.

**Fora:**
- Separar o job em estágios e rodar os testes (#68).
- Scanners novos: gitleaks, zizmor etc. (#69).
- Mudar a versão do Node do CI (continua 22) ou a integração com a Vercel.
- As configurações de org (SHA obrigatório e token *read-only*). Ficam na Raiz-Labs/comandou-api#70 e valem para a org inteira.

## Abordagem

### Sequência de PRs
Cada PR sai da `dev` e volta por PR para a `dev`.
1. **`chore/fase-0-npm-audit-fix`**:
   - rodar `npm audit fix`;
   - rodar `npm run lint`, `npm run typecheck`, `npx ng test --watch=false` e `npm run build`;
   - **conferir no diff que todos os `@angular/*` terminaram na mesma versão**. Versões misturadas quebram o build.
2. **`ci/fase-0-endurecer-workflows`**: todo o resto.

### Como obter o SHA de uma action
Usar o commit, não o objeto da tag anotada (mesma regra da api#70):
```bash
git ls-remote https://github.com/actions/checkout 'refs/tags/v6*' | sort -k2 -V | tail -2
```
Usar a linha terminada em `^{}`, quando existir.

### `.github/dependabot.yml`
```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
    cooldown: { default-days: 5 }
    groups:
      angular: { patterns: ['@angular/*', '@angular-eslint/*'] }
      minor-e-patch: { update-types: [minor, patch] }
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: weekly }
    cooldown: { default-days: 5 }
    groups:
      actions: { patterns: ['*'] }
```

## Critério de aceite

- [ ] `npm audit --audit-level=high` termina com código 0 na `dev`.
- [ ] O comando abaixo não imprime nada:
  ```bash
  grep -nE 'uses: [^.][^ ]*@' .github/workflows/*.yml | grep -vE '@[0-9a-f]{40}'
  ```
- [ ] O `ci.yml` tem `permissions:` no topo, `concurrency` e `timeout-minutes`.
- [ ] Um segundo push no mesmo PR cancela o run anterior.
- [ ] O step de auditoria roda e passa.
- [ ] O Dependabot abre PRs agrupados (`angular`, `minor-e-patch`, `actions`) na semana seguinte ao merge.
- [ ] O CI fica verde no PR para a `dev`, e o deploy de preview da Vercel continua funcionando.

## Questões em aberto

- Se o `npm audit fix` exigir subir o Angular para uma minor nova, rodar o build de preview da Vercel e o e2e local (`npm run test:e2e`) antes do merge.

## Resultado da implementação

- **PR 1 (#70): dependências.**
  - O `npm audit fix` sozinho subiu só o `@angular/cli`, e o `npm install` com as versões novas caiu em conflito de peer (`ERESOLVE`).
  - A atualização foi feita com `ng update @angular/core@21.2 @angular/cli@21.2`: framework em 21.2.26 e tooling (`@angular/build`, `@angular/cli`) em 21.2.30, todos alinhados. Depois veio um `npm audit fix` final.
  - Resultado: 3 críticas + 24 altas viraram **0 críticas/altas** (restam 16 moderadas).
  - Validações: 0 erros de lint, typecheck limpo, 159 testes passando e build com bundle inicial de 313,63 kB.
- **PR 2 (este): workflow e Dependabot.**
  - **Actions:** `actions/checkout@v7.0.1` e `actions/setup-node@v7.1.0` pinadas por SHA (mesmos SHAs da api#77), com `persist-credentials: false`.
  - **Limites do workflow:** `permissions: contents: read`, `concurrency` (cancela só em PR) e `timeout-minutes: 15`.
  - **Auditoria:** step "Auditoria de dependências" com `npm audit --audit-level=high` e `npm audit signatures`. Localmente: 573 pacotes com assinatura verificada.
  - **Dependabot:** `.github/dependabot.yml` com `npm` (grupos `angular` e `minor-e-patch`) e `github-actions`, ambos com `target-branch: dev` e `cooldown` de 5 dias.
- **Política de SHA obrigatório na org:** só pode ser ligada depois que este PR e a api#77 (já na `dev`) estiverem mergeados. Antes disso, o CI da `dev`/`main` do web ainda usa `@v4` e quebraria.
