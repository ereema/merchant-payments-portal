import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from '../../core/services/application.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  MerchantApplication,
  ApplicationStatus,
  ApplicationListParams,
} from '../../core/models/application.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private appService = inject(ApplicationService);
  auth = inject(AuthService);

  applications = signal<MerchantApplication[]>([]);
  total = signal(0);
  totalPages = signal(1);
  loading = signal(false);
  error = signal<string | null>(null);

  // Filters
  page = signal(1);
  pageSize = 10;
  statusFilter = signal<ApplicationStatus | ''>('');
  search = signal('');

  statusOptions: (ApplicationStatus | '')[] = [
    '',
    'DRAFT',
    'SUBMITTED',
    'IN_REVIEW',
    'APPROVED',
    'REJECTED',
  ];

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);

    const params: ApplicationListParams = {
      page: this.page(),
      pageSize: this.pageSize,
      status: this.statusFilter() || undefined,
      search: this.search() || undefined,
      sortBy: 'updatedAt',
      sortDir: 'desc',
    };

    this.appService.getApplications(params).subscribe({
      next: (res) => {
        this.applications.set(res.items);
        this.total.set(res.total);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load applications');
        this.loading.set(false);
      },
    });
  }

  onSearch() {
    this.page.set(1);
    this.load();
  }

  onStatusChange() {
    this.page.set(1);
    this.load();
  }

  goToPage(p: number) {
    if (p < 1 || p > this.totalPages()) return;
    this.page.set(p);
    this.load();
  }

  statusBadgeClass(status: ApplicationStatus): string {
    const map: Record<ApplicationStatus, string> = {
      DRAFT: 'bg-secondary',
      SUBMITTED: 'bg-info',
      IN_REVIEW: 'bg-warning text-dark',
      APPROVED: 'bg-success',
      REJECTED: 'bg-danger',
    };
    return map[status] || 'bg-secondary';
  }

  canCreate = computed(() => this.auth.hasRole('SALES', 'ADMIN'));
}
