import { Injectable, signal } from '@angular/core';

/**
 * Relógio compartilhado — um único setInterval por app em vez de cada
 * componente rodar o seu. Pausa quando a aba perde foco (Page Visibility)
 * e retoma (com atualização imediata) ao voltar.
 */
@Injectable({ providedIn: 'root' })
export class RelogioService {
  private readonly _horaAtual = signal(this.formatarHora());
  readonly horaAtual = this._horaAtual.asReadonly();

  private intervalId: ReturnType<typeof setInterval> | null = null;
  private assinantes = 0;

  constructor() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this._horaAtual.set(this.formatarHora());
        if (this.assinantes > 0) this.iniciarInterval();
      } else {
        this.pararInterval();
      }
    });
  }

  /** Chamar em ngOnInit; guardar e chamar a função retornada em ngOnDestroy. */
  registrar(): () => void {
    this.assinantes++;
    if (this.assinantes === 1 && document.visibilityState === 'visible') {
      this.iniciarInterval();
    }
    return () => {
      this.assinantes--;
      if (this.assinantes === 0) this.pararInterval();
    };
  }

  private iniciarInterval(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this._horaAtual.set(this.formatarHora());
    }, 1000);
  }

  private pararInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private formatarHora(): string {
    return new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
