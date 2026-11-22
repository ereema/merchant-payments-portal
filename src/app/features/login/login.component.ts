import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    email: ['sales@demo.com', [Validators.required, Validators.email]],
    password: ['sales123', Validators.required],
  });

  // Demo credentials helper
  demoUsers = [
    { email: 'sales@demo.com', password: 'sales123', role: 'SALES' },
    { email: 'reviewer@demo.com', password: 'review123', role: 'REVIEWER' },
    { email: 'admin@demo.com', password: 'admin123', role: 'ADMIN' },
  ];

  useDemo(email: string, password: string) {
    this.form.patchValue({ email, password });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.message || 'Login failed');
      },
    });
  }
}
