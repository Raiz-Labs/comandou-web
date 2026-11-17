import { Component, input, output, computed } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <nav class="paginacao" aria-label="Paginação">
      <button
        class="paginacao__seta"
        [disabled]="page() <= 1"
        (click)="pageChange.emit(page() - 1)"
        aria-label="Página anterior"
      >
        <lucide-icon name="chevron-left" [size]="16" />
      </button>

      @for (n of numeros(); track n) {
        <button
          class="paginacao__num"
          [class.paginacao__num--ativo]="n === page()"
          [attr.aria-current]="n === page() ? 'page' : null"
          (click)="pageChange.emit(n)"
        >
          {{ n }}
        </button>
      }

      <button
        class="paginacao__seta"
        [disabled]="page() >= totalPages()"
        (click)="pageChange.emit(page() + 1)"
        aria-label="Próxima página"
      >
        <lucide-icon name="chevron-right" [size]="16" />
      </button>
    </nav>
  `,
  styles: [`
    .paginacao { display: flex; align-items: center; gap: var(--b-space-1); justify-content: center; padding: var(--b-space-4) 0; }
    .paginacao__seta, .paginacao__num {
      min-width: 44px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--b-radius-sm);
      border: 1px solid var(--b-neutral-200);
      background: transparent;
      color: var(--b-fg);
      font-family: var(--b-font-sans);
      font-size: var(--b-font-size-sm);
      cursor: pointer;
      &:hover:not(:disabled) { background-color: var(--b-bg-sunken); }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }
    .paginacao__num--ativo {
      background-color: var(--b-primary-500);
      border-color: var(--b-primary-500);
      color: var(--b-fg-inverted);
      font-weight: var(--b-font-weight-semibold);
    }
  `],
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageChange = output<number>();

  // Lista simples 1..totalPages — telas do admin não costumam ter volume
  // grande o bastante pra justificar truncamento com reticências.
  protected readonly numeros = computed(() =>
    Array.from({ length: this.totalPages() }, (_, i) => i + 1),
  );
}
