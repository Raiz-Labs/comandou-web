import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MarcaComponent, VarianteMarca } from './marca.component';
import { NOME, SINO, SINO_PEQUENO } from './marca.paths';

function render(variante: VarianteMarca, tamanho?: number | string, decorativa?: boolean | string): HTMLElement {
  const fixture = TestBed.createComponent(MarcaComponent);
  fixture.componentRef.setInput('variante', variante);
  if (tamanho !== undefined) fixture.componentRef.setInput('tamanho', tamanho);
  if (decorativa !== undefined) fixture.componentRef.setInput('decorativa', decorativa);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const ds = (el: HTMLElement) => [...el.querySelectorAll('path')].map((p) => p.getAttribute('d'));

describe('MarcaComponent', () => {
  for (const variante of ['horizontal', 'simbolo', 'empilhada'] as const) {
    it(`renderiza ${variante} como imagem acessível`, () => {
      const svg = render(variante).querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg!.getAttribute('role')).toBe('img');
      expect(svg!.getAttribute('aria-label')).toBe('Comandou');
      expect(svg!.querySelector('title')).toBeNull();
    });
  }

  it('horizontal e empilhada levam o nome; símbolo não', () => {
    expect(ds(render('horizontal'))).toContain(NOME);
    expect(ds(render('empilhada'))).toContain(NOME);
    expect(ds(render('simbolo'))).not.toContain(NOME);
  });

  it('símbolo abaixo de 32 px usa a versão simplificada', () => {
    expect(ds(render('simbolo', 24))).toEqual([SINO_PEQUENO.domo, SINO_PEQUENO.base]);
    expect(ds(render('simbolo', 48))).toEqual([SINO.domo, SINO.base]);
  });

  it('símbolo em exatamente 32 px já usa o sino completo', () => {
    expect(ds(render('simbolo', 31))).toEqual([SINO_PEQUENO.domo, SINO_PEQUENO.base]);
    expect(ds(render('simbolo', 32))).toEqual([SINO.domo, SINO.base]);
  });

  it('pinta o sino e o nome com as classes que carregam os tokens de cor', () => {
    const el = render('horizontal');
    const nome = [...el.querySelectorAll('path')].find((p) => p.getAttribute('d') === NOME)!;
    expect(nome.classList).toContain('nome');
    expect(el.querySelectorAll('path.sino').length).toBe(2);
    expect(el.querySelectorAll('path:not(.sino):not(.nome)').length).toBe(0);
  });

  it('decorativa some do leitor de tela, inclusive escrita como atributo estático', () => {
    for (const decorativa of [true, '']) {
      const svg = render('simbolo', 24, decorativa).querySelector('svg')!;
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.hasAttribute('role')).toBe(false);
      expect(svg.hasAttribute('aria-label')).toBe(false);
    }
  });

  it('aceita tamanho em string (atributo estático) como número', () => {
    const el = render('simbolo', '24');
    expect(el.querySelector('svg')!.getAttribute('height')).toBe('24');
    expect(ds(el)).toEqual([SINO_PEQUENO.domo, SINO_PEQUENO.base]);
  });

  it('aplica o tamanho como altura do svg', () => {
    expect(render('horizontal', 22).querySelector('svg')!.getAttribute('height')).toBe('22');
  });
});
