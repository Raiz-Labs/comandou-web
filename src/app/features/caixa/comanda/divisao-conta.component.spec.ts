import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { LUCIDE_ICONS, LucideIconProvider, Minus, Plus, Users } from 'lucide-angular';
import { DivisaoContaComponent } from './divisao-conta.component';

describe('DivisaoContaComponent — divisão por N pessoas', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DivisaoContaComponent],
      providers: [
        { provide: LUCIDE_ICONS, multi: true, useValue: new LucideIconProvider({ Minus, Plus, Users }) },
      ],
    });
  });

  it('divisões nunca desce de 1', () => {
    const fixture = TestBed.createComponent(DivisaoContaComponent);
    fixture.componentRef.setInput('total', 100);
    fixture.detectChanges();

    fixture.componentInstance['decrementar']();

    expect(fixture.componentInstance['divisoes']()).toBe(1);
  });

  it('valorPorPessoa divide o total igualmente', () => {
    const fixture = TestBed.createComponent(DivisaoContaComponent);
    fixture.componentRef.setInput('total', 90);
    fixture.detectChanges();

    fixture.componentInstance['incrementar']();
    fixture.componentInstance['incrementar']();

    expect(fixture.componentInstance['divisoes']()).toBe(3);
    expect(fixture.componentInstance['valorPorPessoa']()).toBeCloseTo(30);
  });

  it('emite divisoesChange a cada incremento/decremento', () => {
    const fixture = TestBed.createComponent(DivisaoContaComponent);
    fixture.componentRef.setInput('total', 100);
    fixture.detectChanges();

    const emitidos: number[] = [];
    fixture.componentInstance.divisoesChange.subscribe((v: number) => emitidos.push(v));

    fixture.componentInstance['incrementar']();
    fixture.componentInstance['decrementar']();

    expect(emitidos).toEqual([2, 1]);
  });
});
