import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from '../../core/services/application.service';
import { AuthService } from '../../core/auth/auth.service';
import { MerchantApplication } from '../../core/models/application.model';

@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './application-detail.component.html',
  styleUrl: './application-detail.component.scss',
})
export class ApplicationDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private appService = inject(ApplicationService);
  auth = inject(AuthService);

  app = signal<MerchantApplication | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Sensitive reveal (role-based)
  revealAccount = signal(false);
  revealTaxId = signal(false);

  // Review form
  reviewDecision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO' = 'APPROVE';
  reviewComment = '';
  reviewing = signal(false);
  reviewError = signal<string | null>(null);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Missing id');
      this.loading.set(false);
      return;
    }
    this.load(id);
  }

  load(id: string) {
    this.loading.set(true);
    this.error.set(null);
    this.appService.getById(id).subscribe({
      next: (a) => {
        this.app.set(a);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load');
        this.loading.set(false);
      },
    });
  }

  toggleRevealAccount() {
    if (this.auth.canRevealSensitive()) {
      this.revealAccount.update((v) => !v);
    }
  }

  toggleRevealTaxId() {
    if (this.auth.canRevealSensitive()) {
      this.revealTaxId.update((v) => !v);
    }
  }

  mask(value: string): string {
    if (!value || value.length < 4) return '••••';
    return '••••' + value.slice(-4);
  }

  submitReview() {
    const a = this.app();
    if (!a || !this.reviewComment.trim()) {
      this.reviewError.set('Comment is required');
      return;
    }
    this.reviewing.set(true);
    this.reviewError.set(null);

    this.appService
      .addRiskDecision(a.id, this.reviewDecision, this.reviewComment.trim())
      .subscribe({
        next: (updated) => {
          this.app.set(updated);
          this.reviewing.set(false);
          this.reviewComment = '';
        },
        error: (err) => {
          this.reviewError.set(err.message);
          this.reviewing.set(false);
        },
      });
  }

  statusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'bg-secondary',
      SUBMITTED: 'bg-info',
      IN_REVIEW: 'bg-warning text-dark',
      APPROVED: 'bg-success',
      REJECTED: 'bg-danger',
    };
    return map[status] || 'bg-secondary';
  }
}
