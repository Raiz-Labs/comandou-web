import { Component } from '@angular/core';

@Component({
  selector: 'app-produtos',
  standalone: true,
  template: `
    <div style="padding: 2rem; font-family: var(--b-font-sans);">
      <h1 style="color: var(--b-primary-500);">Produtos</h1>
      <p style="color: var(--b-fg-muted); margin-top: 0.5rem;">Em desenvolvimento — TASK pendente</p>
    </div>
  `,
})
export class ProdutosComponent {}
