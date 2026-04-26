import { Pipe, PipeTransform } from '@angular/core';
import { StatusItem } from '../types';

const LABELS: Record<StatusItem, string> = {
  pendente:   'Pendente',
  em_preparo: 'Em preparo',
  pronto:     'Pronto',
  entregue:   'Entregue',
  cancelado:  'Cancelado',
};

@Pipe({ name: 'statusLabel', standalone: true })
export class StatusLabelPipe implements PipeTransform {
  transform(value: StatusItem | null | undefined): string {
    if (!value) return '—';
    return LABELS[value] ?? value;
  }
}
