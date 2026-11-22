import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'applications/new',
    canActivate: [authGuard, roleGuard('SALES', 'ADMIN')],
    loadComponent: () =>
      import('./features/application-wizard/application-wizard.component').then(
        (m) => m.ApplicationWizardComponent
      ),
  },
  {
    path: 'applications/:id/edit',
    canActivate: [authGuard, roleGuard('SALES', 'ADMIN')],
    loadComponent: () =>
      import('./features/application-wizard/application-wizard.component').then(
        (m) => m.ApplicationWizardComponent
      ),
  },
  {
    path: 'applications/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/application-detail/application-detail.component').then(
        (m) => m.ApplicationDetailComponent
      ),
  },
  { path: '**', redirectTo: 'dashboard' },
];
