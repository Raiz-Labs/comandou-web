# `master.comandou.app.br/` cai no login de restaurante

- **Issue:** #62 — https://github.com/Raiz-Labs/comandou-web/issues/62
- **Status:** Draft
- **Repo:** Raiz-Labs/comandou-web

## Problema

`getTenantSlug()` (`src/environments/environment.prod.ts`) usa o primeiro pedaço do host como slug. Em `master.comandou.app.br`, o slug vira `master`.

As rotas (`src/app/app.routes.ts`) mandam a raiz e qualquer rota desconhecida (`**`) para `/login`, que é o login de **restaurante**. Quem digita só `master.comandou.app.br` cai nessa tela (com "Master" no título, o que parece o lugar certo). O login então vai para `POST /auth/login` com `X-Tenant-Slug: master` e falha. O login master certo fica em `/master/login`.

### Evidência (teste E2E em produção, 18/11/2026)
- **Credenciais corretas recusadas.** O admin master tentou entrar com email e senha corretos (conferidos no banco por `bcrypt.compare`, resultado `true`), e o login falhou. Logs da API:
  ```
  POST /auth/login  slug=master → 404 "Tenant não encontrado"   (3 tentativas)
  ```
  Nenhuma tentativa chegou a `/master/auth/login`.
- **Redirecionamento:** abrir `https://master.comandou.app.br/` leva a `https://master.comandou.app.br/login`, que mostra o formulário de restaurante.

## Escopo

**Dentro:**
- quando o slug do host for `master`, a raiz, `/login` e as rotas desconhecidas redirecionam para `/master/login`;
- teste unitário da regra de redirecionamento.

**Fora:**
- recusar slugs reservados na criação de tenant (Raiz-Labs/comandou-api#66);
- mudar o acesso ao master por `comandou.app.br/master/login`, que continua funcionando;
- mudar o login de restaurante para os demais slugs.

## Abordagem

- **Guard nas rotas de restaurante.** Um guard funcional nas rotas `''`, `login` e `**` de `app.routes.ts` devolve `router.createUrlTree(['/master/login'])` quando `environment.tenantSlug === 'master'`. Segue o padrão dos guards de `core/master/master.guard.ts`.
- **Slug fica no environment.** O nome `master` vira uma constante exportada em `environment*.ts`, junto com a resolução do slug.

## Critério de aceite

- [ ] `https://master.comandou.app.br/` abre `/master/login`;
- [ ] `https://master.comandou.app.br/login` redireciona para `/master/login`;
- [ ] `https://demo.comandou.app.br/` continua abrindo o login de restaurante;
- [ ] Teste unitário cobre os dois casos (slug `master` e slug comum).
