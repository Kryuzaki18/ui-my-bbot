import { AfterViewInit, Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';
import {
  PRIVACY_META,
  PRIVACY_SECTIONS,
  PRIVACY_COLLECT_ITEMS,
  PRIVACY_ACCOUNT_ITEMS,
  PRIVACY_USAGE_ITEMS,
  PRIVACY_USE_CARDS,
  PRIVACY_STORAGE_ITEMS,
  PRIVACY_TECH_STACK,
  PRIVACY_THIRD_PARTY,
  PRIVACY_COOKIES,
  PRIVACY_RETENTION_ITEMS,
  PRIVACY_RIGHTS_CARDS,
} from '../../../core/data/privacy-policy.data';

@Component({
  selector: 'app-privacy',
  imports: [NgClass, RouterModule, ButtonModule, TagModule, DividerModule, ChipModule],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
  standalone: true,
})
export class PrivacyComponent implements AfterViewInit {
  private readonly el = inject(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly effectiveDate = PRIVACY_META.effectiveDate;
  readonly version = PRIVACY_META.version;

  readonly activeSection = signal<string>('collect');

  readonly sections = PRIVACY_SECTIONS;
  readonly collectItems = PRIVACY_COLLECT_ITEMS;
  readonly accountItems = PRIVACY_ACCOUNT_ITEMS;
  readonly usageItems = PRIVACY_USAGE_ITEMS;
  readonly useCards = PRIVACY_USE_CARDS;
  readonly storageItems = PRIVACY_STORAGE_ITEMS;
  readonly techStack = PRIVACY_TECH_STACK;
  readonly thirdParty = PRIVACY_THIRD_PARTY;
  readonly cookies = PRIVACY_COOKIES;
  readonly retentionItems = PRIVACY_RETENTION_ITEMS;
  readonly rightsCards = PRIVACY_RIGHTS_CARDS;

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
