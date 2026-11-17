import { DestroyRef, inject } from '@angular/core';

// Mesmo mecanismo (Page Visibility API) que RelogioService já usa em
// produção pra pausar/retomar o relógio — aqui como utilitário por
// componente em vez de serviço singleton, já que cada tela recarrega um
// resource() diferente. Só dispara na transição pra 'visible', nunca no
// mount inicial nem em polling enquanto a aba já está visível.
export function recarregarAoFocar(callback: () => void): void {
  const destroyRef = inject(DestroyRef);

  const listener = () => {
    if (document.visibilityState === 'visible') callback();
  };

  document.addEventListener('visibilitychange', listener);
  destroyRef.onDestroy(() => document.removeEventListener('visibilitychange', listener));
}
