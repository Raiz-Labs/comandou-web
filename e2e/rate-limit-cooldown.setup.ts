import { test as cooldown } from '@playwright/test';

// ponytail: espera fixa de 61s, não uma solução elegante — mas o
// authRateLimiter da API (5 req/min, compartilhado entre /auth/login e
// /auth/refresh) não tem bypass pra e2e hoje, e auth.setup.ts sozinho já
// consome as 5 chamadas permitidas na janela. Sem essa espera, os specs que
// vêm depois (login.spec.ts) estouram o limite na primeira tentativa.
// Upgrade: se/quando a API ganhar um bypass de rate limit pra ambiente de
// e2e, essa espera some.
cooldown.setTimeout(70_000);

cooldown('aguarda a janela do rate limit de auth zerar', async () => {
  await new Promise((resolve) => setTimeout(resolve, 61_000));
});
