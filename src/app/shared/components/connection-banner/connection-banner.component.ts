import { Component, inject } from '@angular/core';
import { SocketService } from '../../../core/socket/socket.service';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-connection-banner',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    @if (socketService.connectionStatus() !== 'connected') {
      <div class="banner" [class.banner--reconnecting]="socketService.connectionStatus() === 'reconnecting'">
        <lucide-icon name="wifi-off" [size]="16" />
        <span>
          @if (socketService.connectionStatus() === 'reconnecting') {
            Reconectando em tempo real...
          } @else {
            Sem conexão em tempo real. Atualize a página.
          }
        </span>
      </div>
    }
  `,
  styles: [`
    .banner {
      display: flex;
      align-items: center;
      gap: var(--b-space-2);
      padding: var(--b-space-2) var(--b-space-4);
      background-color: var(--b-warning-100);
      color: var(--b-warning-700);
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-medium);
      border-bottom: 1px solid var(--b-warning-500);

      &--reconnecting {
        background-color: var(--b-info-100);
        color: var(--b-info-700);
        border-color: var(--b-info-500);
      }
    }
  `],
})
export class ConnectionBannerComponent {
  readonly socketService = inject(SocketService);
}
