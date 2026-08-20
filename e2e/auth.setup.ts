import { test as setup, expect } from '@playwright/test';

const TENANT = 'burguer-test';
const SENHA = '123456';

const PERFIS = [
  { perfil: 'admin', email: 'admin@burguer.com', home: '/admin/dashboard' },
  { perfil: 'caixa', email: 'caixa@burguer.com', home: '/caixa/comandas' },
  { perfil: 'garcom', email: 'garcom@burguer.com', home: '/garcom/mesas' },
  { perfil: 'cozinha', email: 'cozinha@burguer.com', home: '/cozinha/fila' },
] as const;

// Loga de verdade pela UI e salva o storageState por perfil — specs futuros
// reaproveitam via test.use({ storageState: 'e2e/.auth/<perfil>.json' }) em
// vez de refazer login em cada teste.
//
// Um teste só, mesma page/contexto reaproveitado entre os 4 perfis: a API
// tem rate limit de 5 req/min compartilhado entre /auth/login e /auth/refresh
// (authRateLimiter em comandou-api), e cada page.goto() dispara um refresh
// automático no bootstrap (authInitializer). Deslogar pelo botão "Sair"
// (navegação in-app via router, sem reload) entre um perfil e outro evita
// re-bootstrapar o app — sem isso, os 4 logins de setup sozinhos já estouram
// o limite.
setup('autenticar todos os perfis e salvar sessão', async ({ page }) => {
  await page.goto(`/login?tenant=${TENANT}`);

  for (const { perfil, email, home } of PERFIS) {
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill(SENHA);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(new RegExp(home));
    await page.context().storageState({ path: `e2e/.auth/${perfil}.json` });
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/login/);
  }
});
