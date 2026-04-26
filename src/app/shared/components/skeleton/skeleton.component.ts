import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div
      class="skeleton"
      [style.width]="width()"
      [style.height]="height()"
      [style.border-radius]="radius()"
    ></div>
  `,
  styles: [`
    .skeleton {
      background-color: var(--b-neutral-200);
      border-radius: var(--b-radius-sm);
      animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.4; }
    }
  `],
})
export class SkeletonComponent {
  readonly width  = input<string>('100%');
  readonly height = input<string>('1rem');
  readonly radius = input<string>('var(--b-radius-sm)');
}
