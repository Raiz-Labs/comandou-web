import { Directive, ElementRef, OnInit, Renderer2 } from '@angular/core';

/** Garante touch target mínimo de 44px (WCAG 2.5.8 / b-system) */
@Directive({
  selector: '[bTouchTarget]',
  standalone: true,
})
export class TouchTargetDirective implements OnInit {
  constructor(
    private readonly el: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2
  ) {}

  ngOnInit(): void {
    const el = this.el.nativeElement;
    this.renderer.setStyle(el, 'min-height', '44px');
    this.renderer.setStyle(el, 'min-width', '44px');
  }
}
