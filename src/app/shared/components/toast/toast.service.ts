import { Injectable, signal } from '@angular/core';

export type ToastVariant = 'success' | 'danger' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  private show(message: string, variant: ToastVariant, duration = 3500): void {
    const id = crypto.randomUUID();
    this.toasts.update((list) => [...list, { id, message, variant, duration }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  danger(message: string, duration?: number): void {
    this.show(message, 'danger', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  dismiss(id: string): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
