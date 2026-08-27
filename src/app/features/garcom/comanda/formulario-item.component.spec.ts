import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  LUCIDE_ICONS,
  LucideIconProvider,
  ArrowLeft,
  Check,
  Loader2,
  Minus,
  Plus,
  X,
} from 'lucide-angular';
import { ConfirmacaoItem, FormularioItemComponent } from './formulario-item.component';

describe('FormularioItemComponent — quantidade e confirmação', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FormularioItemComponent],
      providers: [
        {
          provide: LUCIDE_ICONS,
          multi: true,
          useValue: new LucideIconProvider({ ArrowLeft, Check, Loader2, Minus, Plus, X }),
        },
      ],
    });
  });

  it('quantidade nunca desce de 1', () => {
    const fixture = TestBed.createComponent(FormularioItemComponent);
    fixture.componentRef.setInput('titulo', 'X-Burguer');
    fixture.componentRef.setInput('preco', 20);
    fixture.detectChanges();

    fixture.componentInstance['decrementarQtd']();

    expect(fixture.componentInstance['quantidade']()).toBe(1);
  });

  it('parte do valorInicial informado', () => {
    const fixture = TestBed.createComponent(FormularioItemComponent);
    fixture.componentRef.setInput('titulo', 'X-Burguer');
    fixture.componentRef.setInput('preco', 20);
    fixture.componentRef.setInput('valorInicial', { quantidade: 3, observacao: 'sem cebola' });
    fixture.detectChanges();

    expect(fixture.componentInstance['quantidade']()).toBe(3);
    expect(fixture.componentInstance['observacao']()).toBe('sem cebola');
  });

  it('confirmar emite quantidade e observação (vazia vira undefined)', () => {
    const fixture = TestBed.createComponent(FormularioItemComponent);
    fixture.componentRef.setInput('titulo', 'X-Burguer');
    fixture.componentRef.setInput('preco', 20);
    fixture.detectChanges();

    fixture.componentInstance['incrementarQtd']();

    let emitido: ConfirmacaoItem | undefined;
    fixture.componentInstance.confirmado.subscribe((p: ConfirmacaoItem) => (emitido = p));
    fixture.componentInstance['confirmar']();

    expect(emitido).toEqual({ quantidade: 2, observacao: undefined });
  });

  it('não emite confirmado enquanto salvando', () => {
    const fixture = TestBed.createComponent(FormularioItemComponent);
    fixture.componentRef.setInput('titulo', 'X-Burguer');
    fixture.componentRef.setInput('preco', 20);
    fixture.componentRef.setInput('salvando', true);
    fixture.detectChanges();

    let chamou = false;
    fixture.componentInstance.confirmado.subscribe(() => (chamou = true));
    fixture.componentInstance['confirmar']();

    expect(chamou).toBe(false);
  });
});
