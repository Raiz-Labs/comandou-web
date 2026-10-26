import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MarcaComponent, VarianteMarca } from './marca.component';
import { NOME, SINO, SINO_PEQUENO } from './marca.paths';

function render(variante: VarianteMarca, tamanho?: number): HTMLElement {
  const fixture = TestBed.createComponent(MarcaComponent);
  fixture.componentRef.setInput('variante', variante);
  if (tamanho !== undefined) fixture.componentRef.setInput('tamanho', tamanho);
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

  it('aplica o tamanho como altura do svg', () => {
    expect(render('horizontal', 22).querySelector('svg')!.getAttribute('height')).toBe('22');
  });
});
