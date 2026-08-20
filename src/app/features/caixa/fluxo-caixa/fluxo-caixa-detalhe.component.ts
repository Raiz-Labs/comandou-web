import { Component, inject, signal, resource } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FluxoCaixaService } from './fluxo-caixa.service';
import { userPerfil } from '../../../core/auth/auth.signal';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ConnectionBannerComponent } from '../../../shared/components/connection-banner/connection-banner.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CurrencyBrPipe } from '../../../shared/pipes/currency-br.pipe';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-fluxo-caixa-detalhe',
  standalone: true,
  imports: [
    SkeletonComponent,
    ConnectionBannerComponent,
    ConfirmDialogComponent,
    CurrencyBrPipe,
    LucideAngularModule,
  ],
  template: `
    <div class="layout">
      <app-connection-banner />

      <header class="header">
        <button class="b-btn-back" (click)="voltar()" aria-label="Voltar">
          <lucide-icon name="arrow-left" [size]="20" />
        </button>
        <h1 class="header__title">Detalhe da movimentação</h1>
      </header>

      <main class="content">
        @if (movimentacao.isLoading()) {
          <app-skeleton height="1.5rem" width="60%" />
          <app-skeleton height="1rem" width="40%" />
          <app-skeleton height="8rem" width="100%" />
        } @else if (movimentacao.error()) {
          <div class="empty-state">
            <lucide-icon name="wifi-off" [size]="40" color="var(--b-fg-subtle)" />
            <p>Erro ao carregar movimentação</p>
            <button class="b-btn-secondary" (click)="movimentacao.reload()">Tentar novamente</button>
          </div>
        } @else if (movimentacao.hasValue()) {
          <div class="detalhe-card">
            <div class="detalhe-card__valor" [class.detalhe-card__valor--saida]="movimentacao.value()!.tipo === 'saida'">
              {{ movimentacao.value()!.tipo === 'saida' ? '-' : '+' }}{{ movimentacao.value()!.valor | currencyBr }}
            </div>

            @if (movimentacao.value()!.status === 'estornada') {
              <span class="badge badge--estornada">Estornada</span>
            }

            <dl class="detalhe-list">
              <dt>Categoria</dt>
              <dd>{{ movimentacao.value()!.categoria }}</dd>

              @if (movimentacao.value()!.descricao) {
                <dt>Descrição</dt>
                <dd>{{ movimentacao.value()!.descricao }}</dd>
              }

              <dt>Origem</dt>
              <dd>{{ movimentacao.value()!.origem === 'automatica' ? 'Automática' : 'Manual' }}</dd>

              @if (movimentacao.value()!.formaPagamento) {
                <dt>Forma de pagamento</dt>
                <dd>{{ movimentacao.value()!.formaPagamento }}</dd>
              }

              <dt>Data</dt>
              <dd>{{ formatarData(movimentacao.value()!.ocorridaEm) }}</dd>
            </dl>

            @if (movimentacao.value()!.comanda) {
              <div class="comanda-vinculo">
                <lucide-icon name="receipt" [size]="16" color="var(--b-primary-500)" />
                <span>
                  Mesa {{ movimentacao.value()!.comanda!.mesa.numero }} ·
                  Total da comanda {{ movimentacao.value()!.comanda!.total | currencyBr }}
                </span>
              </div>
            }

            @if (podeEstornar()) {
              <button class="b-btn-danger" (click)="confirmandoEstorno.set(true)">
                <lucide-icon name="undo-2" [size]="16" />
                Estornar movimentação
              </button>
            }
          </div>
        }
      </main>
    </div>

    @if (confirmandoEstorno()) {
      <app-confirm-dialog
        title="Estornar movimentação?"
        message="Isso cria uma movimentação contrária e atualiza o saldo. O registro original continua visível no histórico."
        confirmLabel="Confirmar estorno"
        cancelLabel="Cancelar"
        [confirmDanger]="true"
        (confirmed)="confirmarEstorno()"
        (cancelled)="confirmandoEstorno.set(false)"
      />
    }
  `,
  styles: [`
    .layout { display: flex; flex-direction: column; min-height: 100dvh; background-color: var(--b-bg); font-family: var(--b-font-sans); }

    .header { display: flex; align-items: center; gap: var(--b-space-3); padding: var(--b-space-4) var(--b-space-6); background-color: var(--b-bg-elevated); border-bottom: 1px solid var(--b-neutral-100); box-shadow: var(--b-shadow-1); }
    .header__title { font-size: var(--b-font-size-xl); font-weight: var(--b-font-weight-bold); color: var(--b-fg); margin: 0; }

    .content { flex: 1; padding: var(--b-space-4); display: flex; flex-direction: column; gap: var(--b-space-3); }
    @media (min-width: 768px) { .content { padding: var(--b-space-6); max-width: 560px; } }

    .detalhe-card { display: flex; flex-direction: column; gap: var(--b-space-4); padding: var(--b-space-6); background-color: var(--b-bg-elevated); border-radius: var(--b-radius-md); border: 1px solid var(--b-neutral-200); box-shadow: var(--b-shadow-1); }
    .detalhe-card__valor { font-size: var(--b-font-size-2xl); font-weight: var(--b-font-weight-extrabold); color: var(--b-success-600); }
    .detalhe-card__valor--saida { color: var(--b-danger-600); }

    .badge { align-self: flex-start; padding: 2px var(--b-space-3); border-radius: var(--b-radius-sm); font-size: var(--b-font-size-xs); font-weight: var(--b-font-weight-semibold); }
    .badge--estornada { background-color: var(--b-danger-50); color: var(--b-danger-600); }

    .detalhe-list { display: grid; grid-template-columns: auto 1fr; gap: var(--b-space-1) var(--b-space-4); margin: 0; }
    .detalhe-list dt { color: var(--b-fg-muted); font-size: var(--b-font-size-sm); }
    .detalhe-list dd { margin: 0; color: var(--b-fg); font-weight: var(--b-font-weight-medium); }

    .comanda-vinculo { display: flex; align-items: center; gap: var(--b-space-2); padding: var(--b-space-3); background-color: var(--b-bg-sunken); border-radius: var(--b-radius-sm); font-size: var(--b-font-size-sm); color: var(--b-fg); }

    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--b-space-3); padding: var(--b-space-16) var(--b-space-4); text-align: center; color: var(--b-fg-muted); }
  `],
})
export class FluxoCaixaDetalheComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fluxoCaixaService = inject(FluxoCaixaService);
  private readonly toast = inject(ToastService);

  private readonly id = this.route.snapshot.paramMap.get('id')!;

  protected readonly confirmandoEstorno = signal(false);

  protected readonly movimentacao = resource({
    loader: () => this.fluxoCaixaService.obterMovimentacao(this.id),
  });

  protected podeEstornar(): boolean {
    return userPerfil() === 'admin' && this.movimentacao.value()?.status === 'ativa';
  }

  protected async confirmarEstorno(): Promise<void> {
    try {
      await this.fluxoCaixaService.estornarMovimentacao(this.id);
      this.toast.success('Movimentação estornada.');
      this.confirmandoEstorno.set(false);
      this.movimentacao.reload();
    } catch {
      this.toast.danger('Não foi possível estornar. Tente novamente.');
    }
  }

  protected voltar(): void {
    this.router.navigateByUrl('/caixa/fluxo-caixa');
  }

  protected formatarData(data: string): string {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
