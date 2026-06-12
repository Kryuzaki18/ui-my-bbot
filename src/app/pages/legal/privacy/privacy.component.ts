import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';

@Component({
  selector: 'app-privacy',
  imports: [RouterModule, ButtonModule, TagModule, DividerModule, ChipModule],
  templateUrl: './privacy.component.html',
  styleUrl: './privacy.component.scss',
  standalone: true,
})
export class PrivacyComponent {
  readonly effectiveDate = 'June 12, 2025';
  readonly version = '1.0';

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
}
