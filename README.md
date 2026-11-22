# Merchant Payments Portal

A merchant payments management portal built with Angular 20 as part of a Senior Frontend Engineer take-home assignment.

The application supports role-based access for Sales, Reviewer, and Admin users, with workflows for creating, managing, and reviewing merchant applications.

## Features

### Dashboard
- Responsive application table with pagination and filtering
- Loading and error states with retry support
- Navigation based on user permissions

### Merchant Applications
- Multi-step application form using Reactive Forms
- Field validation and draft auto-save
- Debounced saving using RxJS
- Application details with risk history
- Approval and rejection actions for authorized users

### Authentication and Access Control
- Role-based access for Sales, Reviewer, and Admin
- Route guards for protected pages
- HTTP interceptor for attaching bearer tokens
- Token refresh handling for concurrent 401 responses
- Sensitive bank account and Tax ID fields masked by default, with role-based access

## Tech Stack

- Angular 20 (standalone components)
- TypeScript
- Angular Signals and Dependency Injection
- RxJS
- Reactive Forms
- Angular Router
- Bootstrap 5 and SCSS
- Vitest and Angular TestBed

## Getting Started

Clone the repository and install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm start
```

Open `http://localhost:4200` in your browser.

Run the unit tests:

```bash
npm test
```

Run the existing Karma tests:

```bash
npm run test:karma
```

Build the application:

```bash
npm run build
```

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| Sales | sales@demo.com | sales123 |
| Reviewer | reviewer@demo.com | review123 |
| Admin | admin@demo.com | admin123 |

## Project Structure

```text
src/
├── app/
│   ├── core/
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   └── auth.service.spec.ts
│   │   ├── guards/
│   │   │   └── auth.guard.ts
│   │   ├── interceptors/
│   │   │   └── auth.interceptor.ts
│   │   ├── mock/
│   │   │   └── mock-api.interceptor.ts
│   │   ├── models/
│   │   │   ├── application.model.ts
│   │   │   └── user.model.ts
│   │   └── services/
│   │       ├── application.service.ts
│   │       └── application.service.spec.ts
│   │
│   ├── features/
│   │   ├── application-detail/
│   │   ├── application-wizard/
│   │   ├── dashboard/
│   │   └── login/
│   │
│   ├── shared/
│   ├── app.config.ts
│   ├── app.routes.ts
│   ├── app.ts
│   └── app.spec.ts
│
├── index.html
├── main.ts
└── styles.scss
```

## Implementation Notes

### Token Refresh

The authentication interceptor handles concurrent unauthorized requests using a shared refresh flow:

1. Requests receiving a 401 response trigger token refresh.
2. A single refresh request is made through the mock `/auth/refresh` endpoint.
3. Other requests wait for the refresh result.
4. Once a new access token is received, waiting requests are retried.
5. If refresh fails, the user is logged out.

### Draft Auto-Save

The application form uses an RxJS pipeline to avoid sending a request for every field change.

```text
form.valueChanges
    → debounceTime(900)
    → filter(hasMinimumData)
    → switchMap(() => saveDraft())
```

Saving errors are handled without clearing the user's form data.

### Content Security Policy

The project includes a CSP explanation in `index.html`.

For production deployments, CSP should preferably be configured through HTTP response headers. An example policy:

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none';
```

## Testing

Unit tests are written using Vitest and Angular TestBed.

The existing Karma test configuration is also retained.

## AI Assistance

AI assistance was used during development for guidance and problem-solving. The implementation was reviewed and tested during development.

## Additional Notes

The optional dashboard status counts and Socket.IO real-time updates were not implemented.