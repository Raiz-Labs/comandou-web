import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { recarregarAoFocar } from './recarregar-ao-focar';

@Component({ selector: 'app-host-teste', standalone: true, template: '' })
class HostTesteComponent {
  readonly callback = vi.fn();
  constructor() {
    recarregarAoFocar(this.callback);
  }
}

const setVisibility = (state: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('recarregarAoFocar', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('não dispara o callback no mount inicial', () => {
    const fixture = TestBed.createComponent(HostTesteComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.callback).not.toHaveBeenCalled();
  });

  it('dispara o callback quando a aba volta a ficar visível', () => {
    const fixture = TestBed.createComponent(HostTesteComponent);
    fixture.detectChanges();

    setVisibility('hidden');
    setVisibility('visible');

    expect(fixture.componentInstance.callback).toHaveBeenCalledTimes(1);
  });

  it('não dispara o callback quando a aba fica oculta', () => {
    const fixture = TestBed.createComponent(HostTesteComponent);
    fixture.detectChanges();

    setVisibility('hidden');

    expect(fixture.componentInstance.callback).not.toHaveBeenCalled();
  });

  it('remove o listener ao destruir o componente', () => {
    const fixture = TestBed.createComponent(HostTesteComponent);
    fixture.detectChanges();
    const callback = fixture.componentInstance.callback;

    fixture.destroy();
    setVisibility('hidden');
    setVisibility('visible');

    expect(callback).not.toHaveBeenCalled();
  });
});
