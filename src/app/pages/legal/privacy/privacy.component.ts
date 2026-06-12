import { AfterViewInit, Component, DestroyRef, ElementRef, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';

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

  readonly effectiveDate = 'June 12, 2025';
  readonly version = '1.0';

  readonly activeSection = signal<string>('collect');

  readonly sections = [
    { id: 'collect', label: '1. Information We Collect' },
    { id: 'use', label: '2. How We Use Your Data' },
    { id: 'storage', label: '3. Data Storage & Security' },
    { id: 'third-party', label: '4. Third-Party Services' },
    { id: 'cookies', label: '5. Cookies & Sessions' },
    { id: 'retention', label: '6. Data Retention' },
    { id: 'rights', label: '7. Your Rights' },
    { id: 'children', label: '8. Children\'s Privacy' },
    { id: 'changes', label: '9. Changes to Policy' },
    { id: 'contact', label: '10. Contact Us' },
  ];

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
