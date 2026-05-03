import { Component, inject } from '@angular/core';
import { NgFor } from '@angular/common';
import { ToastService } from './toast.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgFor, LucideAngularModule],
  template: `
    <div class="toast-container">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast--{{ toast.variant }}" role="alert">
          <span class="toast__message">{{ toast.message }}</span>
          <button class="toast__close" (click)="toastService.dismiss(toast.id)" aria-label="Fechar">
            <lucide-icon name="x" [size]="16" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: var(--b-space-6);
      right: var(--b-space-6);
      display: flex;
      flex-direction: column;
      gap: var(--b-space-2);
      z-index: var(--b-z-toast);
      max-width: 360px;
      width: calc(100vw - var(--b-space-8));

      @media (max-width: 768px) {
        bottom: var(--b-space-4);
        left: var(--b-space-4);
        right: var(--b-space-4);
        width: auto;
        max-width: none;
      }
    }

    .toast {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--b-space-3);
      padding: var(--b-space-3) var(--b-space-4);
      border-radius: var(--b-radius-sm);
      box-shadow: var(--b-shadow-3);
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-medium);
      animation: slideIn 200ms ease;

      &--success {
        background-color: var(--b-success-500);
        color: #fff;
      }
      &--danger {
        background-color: var(--b-danger-500);
        color: #fff;
      }
      &--warning {
        background-color: var(--b-warning-500);
        color: var(--b-fg);
      }
      &--info {
        background-color: var(--b-info-500);
        color: #fff;
      }
    }

    .toast__message { flex: 1; }

    .toast__close {
      background: none;
      border: none;
      color: inherit;
      opacity: 0.8;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 2px;

      &:hover { opacity: 1; }
    }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to   { transform: translateX(0);   opacity: 1; }
    }
  `],
})
export class ToastComponent {
  readonly toastService = inject(ToastService);
}
