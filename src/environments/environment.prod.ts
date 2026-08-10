const SLUG_VALIDO = /^[a-z0-9-]+$/;

export const environment = {
  production: true,
  tenantSlug: getTenantSlug(),
  apiUrl: 'https://api.comandou.app.br',
  wsUrl: 'https://api.comandou.app.br',
};

function getTenantSlug(): string {
  const hostname = window?.location?.hostname ?? '';
  const parts = hostname.split('.');
  if (parts.length < 3) return '';

  const slug = parts[0];
  if (!SLUG_VALIDO.test(slug)) {
    console.warn(`[tenant] slug rejeitado por formato inválido: "${slug}"`);
    return '';
  }
  return slug;
}
