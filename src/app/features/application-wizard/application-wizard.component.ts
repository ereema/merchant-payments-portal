import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, debounceTime, switchMap, takeUntil, filter, catchError, of, tap } from 'rxjs';
import { ApplicationService } from '../../core/services/application.service';
import { MerchantApplication } from '../../core/models/application.model';

/** Simple custom validator: tax ID format (XX-XXXXXXX or similar) */
function taxIdValidator(control: AbstractControl): ValidationErrors | null {
  const v = (control.value || '').trim();
  if (!v) return null;
  // Accept US EIN style or generic alphanumeric
  if (!/^[\w-]{5,20}$/.test(v)) {
    return { taxIdFormat: true };
  }
  return null;
}

@Component({
  selector: 'app-application-wizard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './application-wizard.component.html',
  styleUrl: './application-wizard.component.scss',
})
export class ApplicationWizardComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private appService = inject(ApplicationService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private destroy$ = new Subject<void>();
  private autoSave$ = new Subject<void>();

  currentStep = signal(1);
  totalSteps = 3;
  saving = signal(false);
  saveError = signal<string | null>(null);
  lastSaved = signal<string | null>(null);
  applicationId = signal<string | null>(null);
  isEdit = signal(false);

  // Reactive form – all steps in one group for easy draft save
  form = this.fb.nonNullable.group({
    // Step 1
    businessName: ['', [Validators.required, Validators.minLength(2)]],
    businessType: ['', Validators.required],
    registrationNumber: ['', [Validators.required, Validators.minLength(4)]],
    industry: ['', Validators.required],
    website: [''],

    // Step 2
    contactName: ['', Validators.required],
    contactEmail: ['', [Validators.required, Validators.email]],
    contactPhone: ['', [Validators.required, Validators.pattern(/^[\d\s+\-()]{7,20}$/)]],
    addressLine1: ['', Validators.required],
    addressLine2: [''],
    city: ['', Validators.required],
    state: ['', Validators.required],
    postalCode: ['', Validators.required],
    country: ['US', Validators.required],

    // Step 3
    bankName: ['', Validators.required],
    bankAccountNumber: ['', [Validators.required, Validators.minLength(6)]],
    taxId: ['', [Validators.required, taxIdValidator]],
    expectedMonthlyVolume: [0, [Validators.required, Validators.min(0)]],
  });

  businessTypes = ['Sole Prop', 'LLC', 'Corporation', 'Partnership', 'Non-profit'];
  industries = [
    'Retail',
    'Food & Beverage',
    'Software',
    'Healthcare',
    'Education',
    'Travel',
    'Other',
  ];

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEdit.set(true);
      this.applicationId.set(id);
      this.loadExisting(id);
    }

    // Auto-save draft on value changes (debounced)
    this.form.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(900),
        filter(() => this.form.dirty && this.hasMinimumData()),
        tap(() => this.autoSave$.next())
      )
      .subscribe();

    this.autoSave$
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.performSave(true)),
        catchError((err) => {
          this.saveError.set(err.message || 'Auto-save failed');
          return of(null);
        })
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private hasMinimumData(): boolean {
    return !!this.form.get('businessName')?.value?.trim();
  }

  private loadExisting(id: string) {
    this.appService.getById(id).subscribe({
      next: (app) => {
        this.form.patchValue({
          businessName: app.businessName,
          businessType: app.businessType,
          registrationNumber: app.registrationNumber,
          industry: app.industry,
          website: app.website || '',
          contactName: app.contactName,
          contactEmail: app.contactEmail,
          contactPhone: app.contactPhone,
          addressLine1: app.addressLine1,
          addressLine2: app.addressLine2 || '',
          city: app.city,
          state: app.state,
          postalCode: app.postalCode,
          country: app.country,
          bankName: app.bankName,
          bankAccountNumber: app.bankAccountNumber,
          taxId: app.taxId,
          expectedMonthlyVolume: app.expectedMonthlyVolume,
        });
        this.form.markAsPristine();
      },
      error: (err) => {
        this.saveError.set(err.message);
      },
    });
  }

  nextStep() {
    if (this.currentStep() < this.totalSteps && this.isStepValid(this.currentStep())) {
      this.currentStep.update((s) => s + 1);
    } else {
      this.markStepTouched(this.currentStep());
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
    }
  }

  isStepValid(step: number): boolean {
    const controlsByStep: Record<number, string[]> = {
      1: ['businessName', 'businessType', 'registrationNumber', 'industry'],
      2: [
        'contactName',
        'contactEmail',
        'contactPhone',
        'addressLine1',
        'city',
        'state',
        'postalCode',
        'country',
      ],
      3: ['bankName', 'bankAccountNumber', 'taxId', 'expectedMonthlyVolume'],
    };
    const keys = controlsByStep[step] || [];
    return keys.every((k) => this.form.get(k)?.valid);
  }

  private markStepTouched(step: number) {
    const controlsByStep: Record<number, string[]> = {
      1: ['businessName', 'businessType', 'registrationNumber', 'industry'],
      2: [
        'contactName',
        'contactEmail',
        'contactPhone',
        'addressLine1',
        'city',
        'state',
        'postalCode',
        'country',
      ],
      3: ['bankName', 'bankAccountNumber', 'taxId', 'expectedMonthlyVolume'],
    };
    (controlsByStep[step] || []).forEach((k) => this.form.get(k)?.markAsTouched());
  }

  saveDraft() {
    this.performSave(true).subscribe();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.performSave(false).subscribe({
      next: (app) => {
        if (app) {
          this.router.navigate(['/applications', app.id]);
        }
      },
    });
  }

  private performSave(isDraft: boolean) {
    this.saving.set(true);
    this.saveError.set(null);

    const raw = this.form.getRawValue();
    const payload: Partial<MerchantApplication> = {
      id: this.applicationId() || undefined,
      ...raw,
      expectedMonthlyVolume: Number(raw.expectedMonthlyVolume) || 0,
    };

    return this.appService.saveApplication(payload, isDraft).pipe(
      tap((app) => {
        this.applicationId.set(app.id);
        this.lastSaved.set(new Date().toLocaleTimeString());
        this.form.markAsPristine();
        this.saving.set(false);
      }),
      catchError((err) => {
        this.saving.set(false);
        this.saveError.set(err.message || 'Save failed');
        throw err;
      })
    );
  }

  // Helpers for template
  showError(controlName: string): boolean {
    const c = this.form.get(controlName);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  getError(controlName: string): string {
    const c = this.form.get(controlName);
    if (!c || !c.errors) return '';
    if (c.errors['required']) return 'Required';
    if (c.errors['email']) return 'Invalid email';
    if (c.errors['minlength']) return `Min length ${c.errors['minlength'].requiredLength}`;
    if (c.errors['pattern']) return 'Invalid format';
    if (c.errors['taxIdFormat']) return 'Invalid tax ID format';
    if (c.errors['min']) return 'Must be ≥ 0';
    return 'Invalid';
  }
}
