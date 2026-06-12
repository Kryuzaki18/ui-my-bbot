import { AfterViewInit, Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';
import {
  TERMS_META,
  TERMS_SECTIONS,
  TERMS_ELIGIBILITY_ITEMS,
  TERMS_RISK_ITEMS,
  TERMS_API_KEY_ITEMS,
  TERMS_CONDUCT_ITEMS,
  TERMS_LIABILITY_ITEMS,
} from '../../../core/data/terms-of-service.data';

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

  readonly effectiveDate = TERMS_META.effectiveDate;
  readonly version = TERMS_META.version;

  readonly activeSection = signal<string>('acceptance');

  readonly sections = TERMS_SECTIONS;
  readonly eligibilityItems = TERMS_ELIGIBILITY_ITEMS;
  readonly riskItems = TERMS_RISK_ITEMS;
  readonly apiKeyItems = TERMS_API_KEY_ITEMS;
  readonly conductItems = TERMS_CONDUCT_ITEMS;
  readonly liabilityItems = TERMS_LIABILITY_ITEMS;

  scrollTo(id: string): void {
    const target = this.el.nativeElement.querySelector(`#${id}`) as HTMLElement | null;
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngAfterViewInit(): void {
    const elements = this.sections
      .map(s => this.el.nativeElement.querySelector(`#${s.id}`) as HTMLElement | null)
      .filter((el): el is HTMLElement => el !== null);

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
