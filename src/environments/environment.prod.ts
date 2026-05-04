export const environment = {
  production: true,
  tenantSlug: getTenantSlug(),
  apiUrl: 'https://comandou-api-production.up.railway.app',
  wsUrl: 'https://comandou-api-production.up.railway.app',
};

function getTenantSlug(): string {
  const hostname = window?.location?.hostname ?? '';
  const parts = hostname.split('.');
  if (parts.length >= 3) return parts[0];
  return '';
}