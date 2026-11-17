import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LUCIDE_ICONS, LucideIconProvider, ChevronLeft, ChevronRight } from 'lucide-angular';
import { PaginationComponent } from './pagination.component';

const setup = (page: number, totalPages: number) => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [PaginationComponent],
    providers: [
      {
        provide: LUCIDE_ICONS,
        multi: true,
        useValue: new LucideIconProvider({ ChevronLeft, ChevronRight }),
      },
    ],
  });
  const fixture = TestBed.createComponent(PaginationComponent);
  fixture.componentRef.setInput('page', page);
  fixture.componentRef.setInput('totalPages', totalPages);
  fixture.detectChanges();
  return fixture;
};

describe('PaginationComponent', () => {
  it('renderiza um botão por página e marca a atual', () => {
    const fixture = setup(2, 3);
    const nums = fixture.debugElement.queryAll(By.css('.paginacao__num'));
    expect(nums.map((n) => n.nativeElement.textContent.trim())).toEqual(['1', '2', '3']);
    expect(nums[1].nativeElement.classList).toContain('paginacao__num--ativo');
  });

  it('desabilita "anterior" na primeira página e "próxima" na última', () => {
    const primeira = setup(1, 3);
    expect(primeira.debugElement.query(By.css('.paginacao__seta[aria-label="Página anterior"]')).nativeElement.disabled).toBe(true);
    expect(primeira.debugElement.query(By.css('.paginacao__seta[aria-label="Próxima página"]')).nativeElement.disabled).toBe(false);

    const ultima = setup(3, 3);
    expect(ultima.debugElement.query(By.css('.paginacao__seta[aria-label="Página anterior"]')).nativeElement.disabled).toBe(false);
    expect(ultima.debugElement.query(By.css('.paginacao__seta[aria-label="Próxima página"]')).nativeElement.disabled).toBe(true);
  });

  it('emite pageChange ao clicar num número ou nas setas', () => {
    const fixture = setup(2, 3);
    const emitted: number[] = [];
    fixture.componentInstance.pageChange.subscribe((p: number) => emitted.push(p));

    fixture.debugElement.queryAll(By.css('.paginacao__num'))[2].nativeElement.click();
    fixture.debugElement.query(By.css('.paginacao__seta[aria-label="Página anterior"]')).nativeElement.click();
    fixture.debugElement.query(By.css('.paginacao__seta[aria-label="Próxima página"]')).nativeElement.click();

    expect(emitted).toEqual([3, 1, 3]);
  });
});
