export const environment = {
  production: true,
  tenantSlug: getTenantSlug(),
  apiUrl: 'https://api.comandou.com.br',
  wsUrl: 'https://api.comandou.com.br',
};

function getTenantSlug(): string {
  const hostname = window?.location?.hostname ?? '';
  const parts = hostname.split('.');
  if (parts.length >= 3) return parts[0];
  return '';
}
