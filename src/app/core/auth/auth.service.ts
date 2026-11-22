import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, BehaviorSubject, filter, take, switchMap } from 'rxjs';
import { AuthResponse, User, UserRole } from '../models/user.model';

const STORAGE_KEY = 'mpp_auth';
const REFRESH_KEY = 'mpp_refresh';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private currentUserSignal = signal<User | null>(this.loadUser());
  private accessTokenSignal = signal<string | null>(this.loadToken());

  // Used by interceptor to share one in-flight refresh
  private refreshInProgress$ = new BehaviorSubject<boolean>(false);
  private refreshedToken$ = new BehaviorSubject<string | null>(null);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());
  readonly role = computed(() => this.currentUserSignal()?.role ?? null);

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/auth/login', { email, password }).pipe(
      tap((res) => this.persistAuth(res))
    );
  }

  /**
   * Called by the auth interceptor when a 401 is received.
   * Makes a real POST /auth/refresh call.
   * Concurrent callers share the same in-flight request.
   */
  refreshToken(): Observable<string> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token'));
    }

    // If a refresh is already in progress, wait for it
    if (this.refreshInProgress$.value) {
      return this.refreshedToken$.pipe(
        filter((t): t is string => t !== null),
        take(1)
      );
    }

    this.refreshInProgress$.next(true);
    this.refreshedToken$.next(null);

    return this.http.post<AuthResponse>('/auth/refresh', { refreshToken }).pipe(
      tap((res) => {
        this.persistAuth(res);
        this.refreshedToken$.next(res.accessToken);
        this.refreshInProgress$.next(false);
      }),
      switchMap((res) => [res.accessToken]),
      catchError((err) => {
        this.refreshInProgress$.next(false);
        this.logout();
        return throwError(() => err);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(REFRESH_KEY);
    this.currentUserSignal.set(null);
    this.accessTokenSignal.set(null);
    this.router.navigate(['/login']);
  }

  getAccessToken(): string | null {
    return this.accessTokenSignal();
  }

  hasRole(...roles: UserRole[]): boolean {
    const r = this.role();
    return r ? roles.includes(r) : false;
  }

  canViewAllApplications(): boolean {
    return this.hasRole('ADMIN', 'REVIEWER');
  }

  canReview(): boolean {
    return this.hasRole('REVIEWER', 'ADMIN');
  }

  canRevealSensitive(): boolean {
    return this.hasRole('REVIEWER', 'ADMIN');
  }

  private persistAuth(res: AuthResponse): void {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accessToken: res.accessToken, user: res.user })
    );
    localStorage.setItem(REFRESH_KEY, res.refreshToken);
    this.currentUserSignal.set(res.user);
    this.accessTokenSignal.set(res.accessToken);
  }

  private loadUser(): User | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw).user as User;
    } catch {
      return null;
    }
  }

  private loadToken(): string | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw).accessToken as string;
    } catch {
      return null;
    }
  }
}
