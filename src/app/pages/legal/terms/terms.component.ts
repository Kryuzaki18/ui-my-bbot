import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';

@Component({
  selector: 'app-terms',
  imports: [RouterModule, ButtonModule, TagModule, DividerModule, ChipModule],
  templateUrl: './terms.component.html',
  styleUrl: './terms.component.scss',
  standalone: true,
})
export class TermsComponent {
  readonly effectiveDate = 'June 12, 2025';
  readonly version = '1.0';

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
}
