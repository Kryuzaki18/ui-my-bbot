import { AfterViewInit, Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';

@Component({
  selector: 'app-terms',
  imports: [NgClass, RouterModule, ButtonModule, TagModule, DividerModule, ChipModule],
  templateUrl: './terms.component.html',
  styleUrl: './terms.component.scss',
  standalone: true,
})
export class TermsComponent implements AfterViewInit {
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly effectiveDate = 'June 12, 2025';
  readonly version = '1.0';

  readonly activeSection = signal<string>('acceptance');

  readonly sections = [
    { id: 'acceptance', label: '1. Acceptance of Terms' },
    { id: 'eligibility', label: '2. Eligibility' },
    { id: 'service', label: '3. Use of Service' },
    { id: 'risks', label: '4. Trading Risks' },
    { id: 'api-keys', label: '5. API Key Security' },
    { id: 'conduct', label: '6. Prohibited Conduct' },
    { id: 'ip', label: '7. Intellectual Property' },
    { id: 'disclaimer', label: '8. Disclaimer of Warranties' },
    { id: 'liability', label: '9. Limitation of Liability' },
    { id: 'termination', label: '10. Termination' },
    { id: 'changes', label: '11. Changes to Terms' },
    { id: 'contact', label: '12. Contact Us' },
  ];

  scrollTo(id: string): void {
    const target = this.el.nativeElement.querySelector(`#${id}`) as HTMLElement | null;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngAfterViewInit(): void {
    const elements = this.sections
      .map(s => this.el.nativeElement.querySelector(`#${s.id}`) as HTMLElement | null)
      .filter((el): el is HTMLElement => el !== null);

    // rootMargin: ignore the top ~112px (app header + legal nav) and only
    // consider sections in the upper-middle band of the visible area.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          this.activeSection.set(visible[0].target.id);
        }
      },
      { rootMargin: '-112px 0px -55% 0px', threshold: 0 },
    );

    elements.forEach(el => observer.observe(el));
    this.destroyRef.onDestroy(() => observer.disconnect());
  }
}
