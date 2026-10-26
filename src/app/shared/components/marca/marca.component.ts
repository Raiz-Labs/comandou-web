import { Component, computed, input } from '@angular/core';
import { NOME, SINO, SINO_PEQUENO } from './marca.paths';

export type VarianteMarca = 'horizontal' | 'simbolo' | 'empilhada';

/**
 * Marca do Comandou (sino de balcão), em SVG inline com as cores do b-system.
 * `tamanho` é a altura em px. Mínimos do guia (docs/logo/kit/GUIA-DE-USO.md):
 * horizontal ≥ 96 px de largura (tamanho ≥ 18), empilhada ≥ 56 px de largura (tamanho ≥ 40),
 * símbolo ≥ 16 px. Abaixo de 32 px o símbolo troca sozinho pela versão simplificada.
 */
@Component({
  selector: 'app-marca',
  standalone: true,
  template: `
    @switch (variante()) {
      @case ('simbolo') {
        <svg viewBox="0 0 256 256" role="img" aria-label="Comandou" [attr.height]="tamanho()">
          <path class="sino" fill-rule="evenodd" [attr.d]="sino().domo" />
          <path class="sino" [attr.d]="sino().base" />
        </svg>
      }
      @case ('empilhada') {
        <svg viewBox="0 0 330.5 231" role="img" aria-label="Comandou" [attr.height]="tamanho()">
          <g transform="translate(37.3 -50)">
            <path class="sino" fill-rule="evenodd" [attr.d]="SINO.domo" />
            <path class="sino" [attr.d]="SINO.base" />
          </g>
          <path class="nome" fill-rule="evenodd" transform="translate(-2.4 230.2) scale(0.55)" [attr.d]="NOME" />
        </svg>
      }
      @default {
        <svg viewBox="0 0 833 148" role="img" aria-label="Comandou" [attr.height]="tamanho()">
          <g transform="translate(-32 -50)">
            <path class="sino" fill-rule="evenodd" [attr.d]="SINO.domo" />
            <path class="sino" [attr.d]="SINO.base" />
            <path class="nome" fill-rule="evenodd" transform="translate(259.7 198)" [attr.d]="NOME" />
          </g>
        </svg>
      }
    }
  `,
  styles: [`
    :host { display: inline-flex; line-height: 0; }
    svg { width: auto; }
    .sino { fill: var(--b-primary-500); }
    .nome { fill: var(--b-fg); }
  `],
})
export class MarcaComponent {
  readonly variante = input<VarianteMarca>('horizontal');
  readonly tamanho = input(32);

  protected readonly SINO = SINO;
  protected readonly NOME = NOME;
  protected readonly sino = computed(() => (this.tamanho() < 32 ? SINO_PEQUENO : SINO));
}
