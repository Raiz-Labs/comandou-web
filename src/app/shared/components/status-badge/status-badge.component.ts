import { Component, input } from '@angular/core';
import { StatusItem } from '../../types';

const STATUS_CONFIG: Record<StatusItem, { label: string; cls: string }> = {
  pendente:   { label: 'Pendente',   cls: 'badge--warning' },
  em_preparo: { label: 'Em preparo', cls: 'badge--info'    },
  pronto:     { label: 'Pronto',     cls: 'badge--success' },
  entregue:   { label: 'Entregue',   cls: 'badge--neutral' },
  cancelado:  { label: 'Cancelado',  cls: 'badge--danger'  },
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span class="badge {{ config().cls }}">{{ config().label }}</span>
  `,
  styles: [`
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: var(--b-radius-full);
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-semibold);
      line-height: 1.5;

      &--warning  { background: var(--b-warning-100);  color: var(--b-warning-700); }
      &--info     { background: var(--b-info-100);     color: var(--b-info-700);    }
      &--success  { background: var(--b-success-100);  color: var(--b-success-700); }
      &--neutral  { background: var(--b-neutral-100);  color: var(--b-neutral-700); }
      &--danger   { background: var(--b-danger-100);   color: var(--b-danger-700);  }
    }
  `],
})
export class StatusBadgeComponent {
  readonly status = input.required<StatusItem>();

  protected config() {
    return STATUS_CONFIG[this.status()];
  }
}
