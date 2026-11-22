# Merchant Payments Portal – Senior Frontend Take-Home

Angular 20+ standalone application for a merchant payments portal.

## Features (all core requirements covered)

### Technology
- Angular 20 + standalone components + built-in control flow (`@if` / `@for`)
- Signals + `inject()`
- Reactive Forms with custom validation
- Bootstrap 5 + SCSS (responsive)
- Lazy-loaded routes + role-based route guards
- **HTTP Interceptor** that attaches Bearer tokens and handles concurrent 401s by refreshing **once** via a real `POST /auth/refresh` mock endpoint
- **Vitest + Angular TestBed** unit tests

### Functionality
- **Dashboard**: Responsive table, server-style pagination & filtering, loading / error / retry, permission-aware
- **Multi-step Wizard**: Reactive Forms, field validation, draft auto-save (RxJS debounce + switchMap)
- **Application Detail**: Sectioned view, risk history, approve/reject controls (hidden from SALES)
- **Sensitive data**: Bank account & Tax ID masked by default; role-based reveal
- **CSP**: Explained in `index.html` and below

## Quick Start

```bash
npm install
npm start          # http://localhost:4200
npm test           # Vitest
```

### Demo Accounts

| Role     | Email              | Password   |
|----------|--------------------|------------|
| SALES    | sales@demo.com     | sales123   |
| REVIEWER | reviewer@demo.com  | review123  |
| ADMIN    | admin@demo.com     | admin123   |

## Architecture (easy to explain in interview)

```
src/app/
  core/
    auth/               # AuthService (signals) + refresh logic
    interceptors/       # authInterceptor (Bearer + concurrent 401 refresh)
    mock/               # MockApiInterceptor (POST /auth/login, /auth/refresh, /api/*)
    guards/
    models/
    services/           # ApplicationService (real HttpClient calls)
  features/
    login/
    dashboard/
    application-wizard/ # multi-step + auto-save
    application-detail/
```

### How the concurrent token refresh works
1. Several requests receive 401 at the same time.
2. First one calls `AuthService.refreshToken()` → real `POST /auth/refresh`.
3. Other concurrent requests wait on a shared `BehaviorSubject`.
4. Once the new access token arrives, all waiting requests are retried with the new token.
5. If refresh fails → logout.

### Auto-save pipeline
```
form.valueChanges
  → debounceTime(900)
  → filter(hasMinimumData)
  → switchMap(() => saveDraft())
```
Errors are shown without wiping form state.

## Content Security Policy
In production prefer HTTP headers. Example:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' data:; connect-src 'self'; frame-ancestors 'none';
```
A note is also present in `index.html`.

## AI Assistance Disclosure
Developed with assistance from an AI coding tool. The candidate reviewed, understood, and can fully explain every part of the code (interceptor refresh pattern, mock backend, auto-save, role checks, Vitest setup).

## Optional items skipped (as allowed)
- Dashboard status counts
- Socket.IO real-time updates
