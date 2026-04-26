import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'currencyBr', standalone: true })
export class CurrencyBrPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }
}
