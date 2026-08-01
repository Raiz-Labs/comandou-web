// Variáveis de ambiente — desenvolvimento
// Em produção, o Angular substitui por environment.prod.ts via fileReplacements

export const environment = {
  production: false,
  tenantSlug: resolveTenantSlug(),
  apiUrl: 'http://localhost:3000',
  wsUrl: 'http://localhost:3000',
};

export const SLUG_VALIDO = /^[a-z0-9-]+$/;
export const DEV_TENANT_STORAGE_KEY = 'comandou_dev_tenant_slug';

export function slugValido(slug: string | null | undefined): string | null {
  if (!slug) return null;
  if (!SLUG_VALIDO.test(slug)) {
    console.warn(`[tenant] slug rejeitado por formato inválido: "${slug}"`);
    return null;
  }
  return slug;
}

/**
 * Lógica pura de resolução — sem tocar em window/sessionStorage — pra poder
 * ser testada diretamente. `hostname` já vem sem subdomínio de tenant real
 * quando o dev está em localhost.
 */
export function resolverSlugPuro(
  hostname: string,
  querySlug: string | null,
  slugSalvo: string | null,
): string {
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return slugValido(parts[0]) ?? '';
  }

  const daQuery = slugValido(querySlug);
  if (daQuery) return daQuery;

  return slugValido(slugSalvo) ?? 'burguer-test';
}

function resolveTenantSlug(): string {
  const hostname = window?.location?.hostname ?? 'localhost';
  const querySlug = new URLSearchParams(window.location.search).get('tenant');
  const slugSalvo = sessionStorage.getItem(DEV_TENANT_STORAGE_KEY);

  const slug = resolverSlugPuro(hostname, querySlug, slugSalvo);

  // Persiste a escolha feita via ?tenant= pra sobreviver à navegação dentro
  // da SPA sem precisar repetir o query param em toda URL.
  if (slugValido(querySlug)) {
    sessionStorage.setItem(DEV_TENANT_STORAGE_KEY, slug);
  }

  return slug;
}
