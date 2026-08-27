import { Component, computed, input, output, signal } from '@angular/core';
import { CurrencyBrPipe } from '../../../shared/pipes/currency-br.pipe';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-divisao-conta',
  standalone: true,
  imports: [CurrencyBrPipe, LucideAngularModule],
  template: `
    <div class="divisao-card">
      <div class="divisao-card__header">
        <lucide-icon name="users" [size]="16" color="var(--b-primary-500)" />
        <span class="divisao-card__titulo">Dividir conta</span>
      </div>

      <div class="divisao-control">
        <button
          class="divisao-btn"
          (click)="decrementar()"
          [disabled]="divisoes() <= 1"
          aria-label="Diminuir"
        >
          <lucide-icon name="minus" [size]="16" />
        </button>
        <div class="divisao-display">
          <span class="divisao-num">{{ divisoes() }}</span>
          <span class="divisao-label">{{ divisoes() === 1 ? 'pessoa' : 'pessoas' }}</span>
        </div>
        <button class="divisao-btn" (click)="incrementar()" aria-label="Aumentar">
          <lucide-icon name="plus" [size]="16" />
        </button>
      </div>

      @if (divisoes() > 1) {
        <div class="divisao-resultado">
          <span class="divisao-resultado__label">Cada pessoa paga</span>
          <span class="divisao-resultado__valor">{{ valorPorPessoa() | currencyBr }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .divisao-card {
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-md);
      border: 1.5px solid var(--b-primary-200);
      padding: var(--b-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--b-space-4);
    }

    .divisao-card__header {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
    }

    .divisao-card__titulo {
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg);
    }

    .divisao-control {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--b-space-5);
    }

    .divisao-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      border-radius: 50%;
      border: 2px solid var(--b-primary-500);
      background-color: transparent;
      color: var(--b-primary-500);
      cursor: pointer;
      transition: background-color 0.1s;

      &:hover:not(:disabled) { background-color: var(--b-primary-50); }
      &:disabled { border-color: var(--b-neutral-300); color: var(--b-neutral-300); cursor: not-allowed; }
    }

    .divisao-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 60px;
    }

    .divisao-num {
      font-size: var(--b-font-size-3xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
      line-height: 1;
    }

    .divisao-label {
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-muted);
      font-weight: var(--b-font-weight-medium);
    }

    .divisao-resultado {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--b-space-3) var(--b-space-3);
      background-color: var(--b-primary-50);
      border-radius: var(--b-radius-sm);
      border: 1px solid var(--b-primary-200);
    }

    .divisao-resultado__label {
      font-size: var(--b-font-size-sm);
      color: var(--b-primary-700);
      font-weight: var(--b-font-weight-medium);
    }

    .divisao-resultado__valor {
      font-size: var(--b-font-size-xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-primary-600);
    }
  `],
})
export class DivisaoContaComponent {
  readonly total = input.required<number>();

  readonly divisoesChange = output<number>();

  protected readonly divisoes = signal(1);

  protected readonly valorPorPessoa = computed(
    () => this.divisoes() > 1 ? this.total() / this.divisoes() : this.total()
  );

  protected incrementar(): void {
    this.divisoes.update(v => v + 1);
    this.divisoesChange.emit(this.divisoes());
  }

  protected decrementar(): void {
    this.divisoes.update(v => Math.max(1, v - 1));
    this.divisoesChange.emit(this.divisoes());
  }
}
