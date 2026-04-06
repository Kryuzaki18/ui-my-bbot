import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'abbreviate',
  standalone: true
})
export class AbbreviatePipe implements PipeTransform {
  transform(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    
    if (isNaN(num)) return '0';
    if (num < 1000) return `$${num.toFixed(2)}`;

    const suffixes = [
      { limit: 1e9, symbol: 'B' },
      { limit: 1e6, symbol: 'M' },
      { limit: 1e3, symbol: 'k' }
    ];

    for (const { limit, symbol } of suffixes) {
      if (num >= limit) {
        // Format: 1k.1+ (One decimal place + the plus sign)
        const simplified = (num / limit).toFixed(1); 
        return `$${simplified.replace('.0', '')}${symbol}`;
      }
    }

    return `$${num.toString()}`;
  }
}