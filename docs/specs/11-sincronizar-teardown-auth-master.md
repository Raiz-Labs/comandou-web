# Teardown simétrico entre auth principal e master durante impersonação

- **Issue:** #11 — https://github.com/Raiz-Labs/comandou-web/issues/11
- **Status:** Implemented
- **Repo:** Raiz-Labs/comandou-web

## Problema

`authState` (auth principal, `auth.signal.ts`) e `masterAuthState` (`master-auth.signal.ts`) são dois signals independentes. Durante impersonação, `MasterAuthService.impersonateTenant()` escreve nos dois ao mesmo tempo: `setAuth()` recebe o token do tenant e `setImpersonating()` marca o master como "acessando tenant X" — a partir daí os dois estados representam a mesma sessão lógica, mas nada os mantém sincronizados depois.

O `authInterceptor` (`auth.interceptor.ts`) trata os 401 de cada sistema em isolamento:
- rotas `/master/*` (linhas 32-40): no 401, chama só `clearMasterAuth()` e redireciona pra `/master/login` — nunca toca `authState`;
- rotas regulares (linhas 52-73): se o refresh falhar, chama só `clearAuth()` e redireciona pra `/login` — nunca toca `masterAuthState`.

Isso produz dois cenários concretos de dessincronização durante uma sessão de impersonação ativa:

1. **Token master expira primeiro:** `clearMasterAuth()` zera `masterAuthState` (incluindo `impersonating`) e manda o usuário pra `/master/login`. `authState` continua válido — se o usuário navegar pra `/admin/*` (voltar no browser, favorito), o `authGuard` deixa passar: ele segue logado como admin do tenant, sem o banner de impersonação (`ShellComponent`, que lê `masterImpersonating()`) e sem o botão "Sair do tenant" pra voltar — sessão presa sem saída visível.
2. **Token do tenant expira primeiro:** o refresh (`AuthService.refresh()`, via `POST /auth/refresh`) falha — o token de impersonação não veio de `/auth/login`, então não há garantia de que exista uma sessão de refresh válida pra ele. `clearAuth()` roda e o usuário é jogado pro `/login` do tenant. `masterAuthState.impersonating` continua populado — se ele voltar pra qualquer tela master, o banner/estado "Você está acessando o tenant X" reaparece incorretamente até o usuário clicar em algo que rode `exitImpersonation()` (nada faz isso automaticamente).

Nenhum teste hoje cobre 401 durante impersonação: `auth.interceptor.spec.ts` testa os dois branches (master e regular) isoladamente, mas nunca com os dois signals populados ao mesmo tempo.

## Escopo

**Dentro:**
- No branch master do interceptor (401 em rota `/master/*`): se `masterAuthState().impersonating` estiver setado no momento do 401, também limpar `authState` (via `clearAuth()`) antes de redirecionar — a sessão de tenant não faz sentido sem o master que a originou;
- No branch regular do interceptor (401 + refresh falho): se `masterAuthState().impersonating` estiver setado, também limpar `masterAuthState` (via `clearMasterAuth()`) em vez de deixar `impersonating` órfão — evita o banner fantasma;
- Teste de integração no `auth.interceptor.spec.ts` cobrindo os dois cenários acima com os dois signals populados simultaneamente (estado pós-`impersonateTenant()`);
- Teste confirmando que o comportamento atual (401 fora de impersonação, cada signal isolado) não muda — não pode limpar `masterAuthState` num 401 regular fora de impersonação, nem `authState` num 401 master sem impersonação ativa.

**Fora:**
- Adicionar refresh de token para o master — não existe hoje (`MasterAuthService` não tem `refresh()`) e a issue original presumia esse fluxo incorretamente; login master expira e força novo login, isso não muda aqui;
- Consolidar os dois signals num único auth state (era a recomendação #3 da issue) — mudança estrutural maior, não necessária pra resolver a dessincronização observada; fica registrada como possível trabalho futuro, não faz parte desta spec;
- Mudar o fluxo de `impersonateTenant()`/`exitImpersonation()` em si — já limpam os dois estados corretamente quando acionados manualmente; o gap é só nos dois caminhos de 401 automático do interceptor;
- Mudar `MasterAuthService.logout()` — já chama `clearAuth()` + `clearMasterAuth()` juntos, não tem o bug.

## Abordagem

Em `auth.interceptor.ts`, os dois `catchError` de 401 passam a checar `masterAuthState().impersonating` antes de decidir o que limpar:

- branch master (~linha 32-40): `if (masterAuthState().impersonating) { clearAuth(); }` antes/depois de `clearMasterAuth()`;
- branch regular, no catch de refresh falho (~linha 60-68): `if (masterAuthState().impersonating) { clearMasterAuth(); }` antes/depois de `clearAuth()`.

Ambos os signals já são importados no arquivo (`clearAuth`, `clearMasterAuth`, `masterAuthState`), não precisa de import novo. Mantém a lógica no interceptor — é o único ponto por onde os dois tipos de 401 passam, evita duplicar a checagem em cada guard/service.

## Critério de aceite

- [x] 401 em rota `/master/*` durante impersonação ativa (`masterAuthState().impersonating` truthy) limpa `masterAuthState` **e** `authState`, e redireciona pra `/master/login`;
- [x] 401 em rota `/master/*` sem impersonação ativa continua limpando só `masterAuthState` (comportamento atual, não regride);
- [x] 401 + refresh falho em rota regular durante impersonação ativa limpa `authState` **e** `masterAuthState` (incluindo `impersonating`), e redireciona pra `/login`;
- [x] 401 + refresh falho em rota regular sem impersonação ativa continua limpando só `authState` (comportamento atual, não regride);
- [x] Teste cobre os quatro casos acima em `auth.interceptor.spec.ts`, populando os dois signals via `setAuth()`/`setMasterAuth()`/`setImpersonating()` conforme o cenário.

## Questões em aberto

Cenário 2 (refresh do token de tenant falhando durante impersonação) presume que `/auth/refresh` pode legitimamente rejeitar uma sessão originada em `/master/tenants/:id/impersonate` — não confirmado contra o comportamento real da API (`comandou-api`). Vale validar lá antes de fechar o teste de integração como comportamento esperado, mas não muda a lógica do teardown proposta aqui: seja qual for a causa do 401, o teardown simétrico é o mesmo.
