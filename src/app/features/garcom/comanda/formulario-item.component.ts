import { Component, OnInit, input, output, signal } from '@angular/core';
import { CurrencyBrPipe } from '../../../shared/pipes/currency-br.pipe';
import { LucideAngularModule } from 'lucide-angular';

export interface ConfirmacaoItem {
  quantidade: number;
  observacao?: string;
}

@Component({
  selector: 'app-formulario-item',
  standalone: true,
  imports: [CurrencyBrPipe, LucideAngularModule],
  template: `
    <div class="b-backdrop" (click)="cancelado.emit()"></div>
    <div class="sheet" role="dialog" aria-modal="true" [attr.aria-label]="titulo()">
      <div class="sheet__header">
        @if (mostrarVoltar()) {
          <button class="b-btn-back" (click)="voltar.emit()" aria-label="Voltar">
            <lucide-icon name="arrow-left" [size]="18" />
          </button>
        }
        <h2 class="sheet__title">{{ titulo() }}</h2>
        <button class="sheet__close" (click)="cancelado.emit()" aria-label="Fechar">
          <lucide-icon name="x" [size]="20" />
        </button>
      </div>

      <div class="form-body">
        <div class="preco-produto">{{ preco() | currencyBr }}</div>

        <!-- Quantidade -->
        <div class="qty-control">
          <button
            class="qty-btn"
            (click)="decrementarQtd()"
            [disabled]="quantidade() <= 1"
            aria-label="Diminuir quantidade"
          >
            <lucide-icon name="minus" [size]="18" />
          </button>
          <span class="qty-value">{{ quantidade() }}</span>
          <button class="qty-btn" (click)="incrementarQtd()" aria-label="Aumentar quantidade">
            <lucide-icon name="plus" [size]="18" />
          </button>
        </div>

        <!-- Observação -->
        <div class="obs-field">
          <label class="b-label" for="obs">Observação (opcional)</label>
          <textarea
            id="obs"
            class="b-input obs-input"
            placeholder="Ex: sem cebola, bem passado..."
            [value]="observacao()"
            (input)="setObservacao($event)"
            rows="3"
            maxlength="200"
          ></textarea>
        </div>

        <!-- Subtotal -->
        <div class="subtotal">
          <span class="subtotal__label">Subtotal</span>
          <span class="subtotal__valor">{{ preco() * quantidade() | currencyBr }}</span>
        </div>

        <!-- Confirmar -->
        <button
          class="b-btn-primary confirm-btn"
          [disabled]="salvando()"
          (click)="confirmar()"
        >
          @if (salvando()) {
            <lucide-icon name="loader-2" [size]="18" class="b-spin" />
            Salvando...
          } @else {
            <lucide-icon name="check" [size]="18" />
            {{ textoConfirmar() }}
          }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .sheet {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-lg) var(--b-radius-lg) 0 0;
      box-shadow: var(--b-shadow-4);
      z-index: 301;
      max-height: 85dvh;
      display: flex;
      flex-direction: column;

      @media (min-width: 768px) {
        left: 50%;
        right: auto;
        width: 480px;
        transform: translateX(-50%);
        border-radius: var(--b-radius-lg);
        bottom: var(--b-space-6);
      }
    }

    .sheet__header {
      display: flex;
      align-items: center;
      gap: var(--b-space-3);
      padding: var(--b-space-4) var(--b-space-4) var(--b-space-3);
      border-bottom: 1px solid var(--b-neutral-100);
      flex-shrink: 0;
    }

    .sheet__title {
      flex: 1;
      font-size: var(--b-font-size-lg);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sheet__close {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      min-height: 44px;
      border-radius: var(--b-radius-sm);
      border: none;
      background-color: transparent;
      color: var(--b-fg-muted);
      flex-shrink: 0;

      &:hover { background-color: var(--b-bg-sunken); }
    }

    .form-body {
      display: flex;
      flex-direction: column;
      gap: var(--b-space-5);
      padding: var(--b-space-5) var(--b-space-4) var(--b-space-6);
      overflow-y: auto;
    }

    .preco-produto {
      font-size: var(--b-font-size-2xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-primary-600);
      text-align: center;
    }

    .qty-control {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--b-space-6);
    }

    .qty-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 48px;
      min-height: 48px;
      border-radius: 50%;
      border: 2px solid var(--b-primary-500);
      background-color: transparent;
      color: var(--b-primary-500);
      transition: background-color 0.1s ease;

      &:hover:not(:disabled) { background-color: var(--b-primary-50); }
      &:disabled {
        border-color: var(--b-neutral-300);
        color: var(--b-neutral-300);
        cursor: not-allowed;
      }
    }

    .qty-value {
      font-size: var(--b-font-size-3xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
      min-width: 48px;
      text-align: center;
    }

    .obs-field {
      display: flex;
      flex-direction: column;
      gap: var(--b-space-2);
    }

    .obs-input {
      resize: none;
      font-size: var(--b-font-size-sm);
    }

    .subtotal {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--b-space-3) var(--b-space-4);
      background-color: var(--b-bg-sunken);
      border-radius: var(--b-radius-md);
    }

    .subtotal__label {
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-medium);
      color: var(--b-fg-muted);
    }

    .subtotal__valor {
      font-size: var(--b-font-size-xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
    }

    .confirm-btn {
      width: 100%;
      min-height: 52px;
    }
  `],
})
export class FormularioItemComponent implements OnInit {
  readonly titulo = input.required<string>();
  readonly preco = input.required<number>();
  readonly valorInicial = input<ConfirmacaoItem>({ quantidade: 1, observacao: '' });
  readonly mostrarVoltar = input(false);
  readonly salvando = input(false);
  readonly textoConfirmar = input('Confirmar');

  readonly confirmado = output<ConfirmacaoItem>();
  readonly cancelado = output<void>();
  readonly voltar = output<void>();

  protected readonly quantidade = signal(1);
  protected readonly observacao = signal('');

  ngOnInit(): void {
    this.quantidade.set(this.valorInicial().quantidade);
    this.observacao.set(this.valorInicial().observacao ?? '');
  }

  protected incrementarQtd(): void {
    this.quantidade.update(v => v + 1);
  }

  protected decrementarQtd(): void {
    this.quantidade.update(v => Math.max(1, v - 1));
  }

  protected setObservacao(event: Event): void {
    this.observacao.set((event.target as HTMLTextAreaElement).value);
  }

  protected confirmar(): void {
    if (this.salvando()) return;
    this.confirmado.emit({
      quantidade: this.quantidade(),
      observacao: this.observacao() || undefined,
    });
  }
}
