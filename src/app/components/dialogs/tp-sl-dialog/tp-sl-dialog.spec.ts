import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TpSlDialog } from './tp-sl-dialog';

describe('TpSlDialog', () => {
  let component: TpSlDialog;
  let fixture: ComponentFixture<TpSlDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TpSlDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(TpSlDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
