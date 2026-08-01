import { describe, it, expect, vi, afterEach } from 'vitest';
import { slugValido, resolverSlugPuro } from './environment';

describe('slugValido', () => {
  it('aceita slugs com letras minúsculas, números e hífen', () => {
    expect(slugValido('burguer-house-2')).toBe('burguer-house-2');
  });

  it('rejeita null/undefined/vazio', () => {
    expect(slugValido(null)).toBeNull();
    expect(slugValido(undefined)).toBeNull();
    expect(slugValido('')).toBeNull();
  });

  it('rejeita caracteres fora de [a-z0-9-] (issue #12: path traversal, injeção)', () => {
    expect(slugValido('../etc/passwd')).toBeNull();
    expect(slugValido('a/b')).toBeNull();
    expect(slugValido('a.b')).toBeNull();
    expect(slugValido('Maiuscula')).toBeNull();
    expect(slugValido('slug com espaço')).toBeNull();
    expect(slugValido('<script>')).toBeNull();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loga um warning quando rejeita um slug malformado, pra auditoria', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    slugValido('slug/invalido');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('slug/invalido'));
  });
});

describe('resolverSlugPuro (issue #9: fallback hardcoded em dev)', () => {
  it('em hostname com 3+ partes (produção/staging), usa o primeiro segmento como slug', () => {
    expect(resolverSlugPuro('burguer-house.comandou.com.br', null, null)).toBe('burguer-house');
  });

  it('em hostname de produção com slug inválido no subdomínio, retorna vazio', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolverSlugPuro('a b.comandou.com.br', null, null)).toBe('');
    warnSpy.mockRestore();
  });

  it('em localhost, usa o slug vindo da query ?tenant= quando presente', () => {
    expect(resolverSlugPuro('localhost', 'outro-restaurante', 'salvo-antes')).toBe('outro-restaurante');
  });

  it('em localhost sem query, usa o slug salvo em sessionStorage', () => {
    expect(resolverSlugPuro('localhost', null, 'restaurante-salvo')).toBe('restaurante-salvo');
  });

  it('em localhost sem query e sem storage, cai no fallback burguer-test', () => {
    expect(resolverSlugPuro('localhost', null, null)).toBe('burguer-test');
  });

  it('ignora um valor de query malformado e cai pro salvo em storage', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolverSlugPuro('localhost', '../malicioso', 'restaurante-valido')).toBe('restaurante-valido');
    warnSpy.mockRestore();
  });
});
