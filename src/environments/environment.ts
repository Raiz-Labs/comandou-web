// Variáveis de ambiente — desenvolvimento
// Em produção, o Angular substitui por environment.prod.ts via fileReplacements

export const environment = {
  production: false,
  // Slug do tenant em dev: ler de variável de ambiente ou fallback para 'dev'
  tenantSlug: getTenantSlug(),
  apiUrl: 'http://localhost:3000',
  wsUrl: 'http://localhost:3000',
};

function getTenantSlug(): string {
  const hostname = window?.location?.hostname ?? 'localhost';
  // Em produção: restaurante.comandou.com.br → slug = 'restaurante'
  const parts = hostname.split('.');
  if (parts.length >= 3) return parts[0];
  // Em dev: usa TENANT_SLUG da env ou 'dev'
  return 'dev';
}
