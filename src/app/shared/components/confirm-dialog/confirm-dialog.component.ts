import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  template: `
    <div class="backdrop" (click)="onCancel()"></div>
    <div class="dialog" role="dialog" aria-modal="true">
      <h2 class="dialog__title">{{ title() }}</h2>
      @if (message()) {
        <p class="dialog__message">{{ message() }}</p>
      }
      <div class="dialog__actions">
        <button class="b-btn-secondary" (click)="onCancel()">{{ cancelLabel() }}</button>
        <button
          class="{{ confirmDanger() ? 'b-btn-danger' : 'b-btn-primary' }}"
          (click)="onConfirm()"
        >
          {{ confirmLabel() }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--b-z-modal);
      padding: var(--b-space-4);
    }

    .backdrop {
      position: fixed;
      inset: 0;
      background-color: rgba(44, 26, 14, 0.5);
      backdrop-filter: blur(2px);
    }

    .dialog {
      position: relative;
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-lg);
      box-shadow: var(--b-shadow-4);
      padding: var(--b-space-6);
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      gap: var(--b-space-4);
    }

    .dialog__title {
      font-size: var(--b-font-size-xl);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg);
    }

    .dialog__message {
      font-size: var(--b-font-size-md);
      color: var(--b-fg-muted);
      line-height: var(--b-line-height-relaxed);
    }

    .dialog__actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--b-space-3);
      margin-top: var(--b-space-2);
    }
  `],
})
export class ConfirmDialogComponent {
  readonly title        = input.required<string>();
  readonly message      = input<string>('');
  readonly confirmLabel = input<string>('Confirmar');
  readonly cancelLabel  = input<string>('Cancelar');
  readonly confirmDanger = input<boolean>(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  onConfirm(): void { this.confirmed.emit(); }
  onCancel(): void  { this.cancelled.emit(); }
}
