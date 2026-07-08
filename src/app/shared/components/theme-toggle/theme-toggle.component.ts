import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { theme, toggleTheme } from '../../../core/theme/theme.signal';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <button
      class="theme-toggle"
      type="button"
      (click)="toggleTheme()"
      [attr.aria-label]="theme() === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'"
    >
      <lucide-icon [name]="theme() === 'dark' ? 'sun' : 'moon'" [size]="18" />
    </button>
  `,
  styles: [`
    .theme-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border: none;
      background: transparent;
      color: var(--b-fg-muted);
      cursor: pointer;
      border-radius: var(--b-radius-sm);
      transition: background-color 0.1s, color 0.1s;

      &:hover {
        background-color: var(--b-bg-sunken);
        color: var(--b-fg);
      }
    }
  `],
})
export class ThemeToggleComponent {
  protected readonly theme = theme;
  protected readonly toggleTheme = toggleTheme;
}
