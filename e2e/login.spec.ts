import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('caixa com credenciais válidas é redirecionado pro home do perfil', async ({ page }) => {
    await page.goto('/login?tenant=burguer-test');
    await page.getByLabel('E-mail').fill('caixa@burguer.com');
    await page.getByLabel('Senha').fill('123456');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/caixa\/comandas/);
  });

  test('credenciais inválidas mostram mensagem de erro e permanecem em /login', async ({ page }) => {
    await page.goto('/login?tenant=burguer-test');
    await page.getByLabel('E-mail').fill('caixa@burguer.com');
    await page.getByLabel('Senha').fill('senha-errada');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
