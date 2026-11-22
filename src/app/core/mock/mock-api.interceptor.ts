
import { HttpInterceptorFn, HttpResponse, HttpRequest } from '@angular/common/http';
import { of, delay, throwError } from 'rxjs';
import { AuthResponse, User } from '../models/user.model';
import {
  MerchantApplication,
  ApplicationListParams,
  PagedResult,
  RiskDecision,
} from '../models/application.model';

const MOCK_USERS: Record<string, { password: string; user: User }> = {
  'sales@demo.com': {
    password: 'sales123',
    user: { id: 'u1', email: 'sales@demo.com', name: 'Alex Sales', role: 'SALES' },
  },
  'reviewer@demo.com': {
    password: 'review123',
    user: { id: 'u2', email: 'reviewer@demo.com', name: 'Jordan Reviewer', role: 'REVIEWER' },
  },
  'admin@demo.com': {
    password: 'admin123',
    user: { id: 'u3', email: 'admin@demo.com', name: 'Sam Admin', role: 'ADMIN' },
  },
};

// ---------- PERSISTENT APPLICATION STORAGE ----------

const APPLICATIONS_STORAGE_KEY = 'merchant_applications';

function loadApplications(): MerchantApplication[] {
  try {
    if (typeof localStorage === 'undefined') {
      return seedApplications();
    }

    const stored = localStorage.getItem(APPLICATIONS_STORAGE_KEY);

    // Initialize storage with seed data on first run.
    if (stored === null) {
      const initialApplications = seedApplications();

      localStorage.setItem(
        APPLICATIONS_STORAGE_KEY,
        JSON.stringify(initialApplications)
      );

      return initialApplications;
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      throw new Error('Invalid applications storage format');
    }

    return parsed as MerchantApplication[];
  } catch (err) {
    console.error('Failed to load applications from storage:', err);
    return seedApplications();
  }
}

// Only update the in-memory collection after storage succeeds.
function persistApplications(
  updatedApplications: MerchantApplication[]
): boolean {
  try {
    if (typeof localStorage === 'undefined') {
      throw new Error('Local storage is unavailable');
    }

    localStorage.setItem(
      APPLICATIONS_STORAGE_KEY,
      JSON.stringify(updatedApplications)
    );

    applications = updatedApplications;

    return true;
  } catch (err) {
    console.error('Failed to persist applications:', err);
    return false;
  }
}

// Persistent store, loaded when the mock API module initializes.
let applications: MerchantApplication[] = loadApplications();

const refreshTokens = new Map<string, string>(); // refreshToken -> userId

function seedApplications(): MerchantApplication[] {
  const now = new Date().toISOString();

  return [
    {
      id: 'app_seed_1',
      businessName: 'Himalayan Coffee Co',
      businessType: 'LLC',
      registrationNumber: 'REG-77821',
      industry: 'Food & Beverage',
      website: 'https://himalayancoffee.example',
      contactName: 'Priya Sharma',
      contactEmail: 'priya@himalayan.example',
      contactPhone: '+977-9800000001',
      addressLine1: 'Thamel Marg 12',
      city: 'Kathmandu',
      state: 'Bagmati',
      postalCode: '44600',
      country: 'NP',
      bankName: 'Nepal Bank',
      bankAccountNumber: '123456789012',
      taxId: 'TAX-998877',
      expectedMonthlyVolume: 25000,
      status: 'SUBMITTED',
      createdBy: 'u1',
      createdByName: 'Alex Sales',
      riskHistory: [],
      createdAt: now,
      updatedAt: now,
      isDraft: false,
    },
    {
      id: 'app_seed_2',
      businessName: 'TechVista Solutions',
      businessType: 'Corporation',
      registrationNumber: 'REG-11233',
      industry: 'Software',
      contactName: 'Raj Patel',
      contactEmail: 'raj@techvista.example',
      contactPhone: '+1-555-0102',
      addressLine1: '100 Innovation Drive',
      city: 'Austin',
      state: 'TX',
      postalCode: '78701',
      country: 'US',
      bankName: 'Chase',
      bankAccountNumber: '987654321098',
      taxId: '12-3456789',
      expectedMonthlyVolume: 120000,
      status: 'IN_REVIEW',
      createdBy: 'u1',
      createdByName: 'Alex Sales',
      assignedReviewerId: 'u2',
      assignedReviewerName: 'Jordan Reviewer',
      riskHistory: [
        {
          id: 'risk_1',
          decision: 'REQUEST_INFO',
          comment: 'Please provide last 3 months bank statements.',
          reviewerId: 'u2',
          reviewerName: 'Jordan Reviewer',
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
      isDraft: false,
    },
    {
      id: 'app_seed_3',
      businessName: 'GreenLeaf Organic',
      businessType: 'Sole Prop',
      registrationNumber: 'REG-44556',
      industry: 'Retail',
      contactName: 'Maya Chen',
      contactEmail: 'maya@greenleaf.example',
      contactPhone: '+1-555-0199',
      addressLine1: '45 Market Street',
      city: 'Portland',
      state: 'OR',
      postalCode: '97201',
      country: 'US',
      bankName: 'Wells Fargo',
      bankAccountNumber: '456789123456',
      taxId: '98-7654321',
      expectedMonthlyVolume: 45000,
      status: 'APPROVED',
      createdBy: 'u1',
      createdByName: 'Alex Sales',
      riskHistory: [
        {
          id: 'risk_2',
          decision: 'APPROVE',
          comment: 'Low risk profile, documents complete.',
          reviewerId: 'u2',
          reviewerName: 'Jordan Reviewer',
          createdAt: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
      isDraft: false,
    },
  ];
}

function generateToken(user: User): string {
  return btoa(JSON.stringify({
    sub: user.id,
    role: user.role,
    exp: Date.now() + 3600_000,
  }));
}

function getUserFromToken(req: HttpRequest<unknown>): User | null {
  const auth = req.headers.get('Authorization');

  if (!auth?.startsWith('Bearer ')) return null;

  try {
    const payload = JSON.parse(atob(auth.slice(7)));
    const entry = Object.values(MOCK_USERS).find(
      (u) => u.user.id === payload.sub
    );

    return entry?.user ?? null;
  } catch {
    return null;
  }
}

function ok<T>(body: T, status = 200) {
  return of(new HttpResponse({ status, body })).pipe(
    delay(300 + Math.random() * 250)
  );
}

function error(message: string, status = 400) {
  return throwError(() => ({
    status,
    error: { message },
  })).pipe(delay(200));
}

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url;

  // ---------- AUTH ----------

  if (req.method === 'POST' && url.endsWith('/auth/login')) {
    const { email, password } = req.body as {
      email: string;
      password: string;
    };

    const entry = MOCK_USERS[email?.toLowerCase()];

    if (!entry || entry.password !== password) {
      return error('Invalid email or password', 401);
    }

    const accessToken = generateToken(entry.user);
    const refreshToken = `refresh_${entry.user.id}_${Date.now()}`;

    refreshTokens.set(refreshToken, entry.user.id);

    const response: AuthResponse = {
      accessToken,
      refreshToken,
      user: entry.user,
      expiresIn: 3600,
    };

    return ok(response);
  }

  if (req.method === 'POST' && url.endsWith('/auth/refresh')) {
    const { refreshToken } = (req.body as {
      refreshToken: string;
    }) || {};

    const userId = refreshTokens.get(refreshToken);

    if (!userId) {
      return error('Invalid or expired refresh token', 401);
    }

    const entry = Object.values(MOCK_USERS).find(
      (u) => u.user.id === userId
    );

    if (!entry) return error('User not found', 401);

    const newAccessToken = generateToken(entry.user);

    // Rotate refresh token.
    refreshTokens.delete(refreshToken);

    const newRefresh = `refresh_${userId}_${Date.now()}`;

    refreshTokens.set(newRefresh, userId);

    return ok({
      accessToken: newAccessToken,
      refreshToken: newRefresh,
      user: entry.user,
      expiresIn: 3600,
    });
  }

  // ---------- APPLICATIONS ----------

  const user = getUserFromToken(req);

  // Force 401 if no valid token on protected routes.
  if (url.includes('/api/') && !user) {
    return error('Unauthorized', 401);
  }

  // ---------- LIST APPLICATIONS ----------

  if (req.method === 'GET' && /\/api\/applications\/?$/.test(url)) {
    const params = req.params;

    const page = +(params.get('page') || 1);
    const pageSize = +(params.get('pageSize') || 10);
    const status = params.get('status') || '';
    const search = (params.get('search') || '').toLowerCase();

    let items = [...applications];

    // Permission: SALES only sees their own applications.
    if (user?.role === 'SALES') {
      items = items.filter((a) => a.createdBy === user.id);
    }

    if (status) {
      items = items.filter((a) => a.status === status);
    }

    if (search) {
      items = items.filter(
        (a) =>
          a.businessName.toLowerCase().includes(search) ||
          a.contactEmail.toLowerCase().includes(search) ||
          a.registrationNumber.toLowerCase().includes(search)
      );
    }

    items.sort((a, b) =>
      a.updatedAt < b.updatedAt ? 1 : -1
    );

    const total = items.length;
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);

    const result: PagedResult<MerchantApplication> = {
      items: pageItems,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };

    return ok(result);
  }

  // ---------- GET APPLICATION BY ID ----------

  const getMatch = url.match(/\/api\/applications\/([^/]+)$/);

  if (req.method === 'GET' && getMatch) {
    const id = getMatch[1];
    const app = applications.find((a) => a.id === id);

    if (!app) return error('Application not found', 404);

    if (user?.role === 'SALES' && app.createdBy !== user.id) {
      return error(
        'You do not have permission to view this application',
        403
      );
    }

    return ok({ ...app });
  }

  // ---------- CREATE / UPDATE APPLICATION ----------

  if (req.method === 'POST' && /\/api\/applications\/?$/.test(url)) {
    const body = req.body as Partial<MerchantApplication> & {
      isDraft?: boolean;
    };

    const now = new Date().toISOString();
    const isDraft = body.isDraft !== false;

    if (body.id) {
      // Update existing application.
      const idx = applications.findIndex((a) => a.id === body.id);

      if (idx === -1) return error('Not found', 404);

      const existing = applications[idx];

      if (user?.role === 'SALES' && existing.createdBy !== user.id) {
        return error('Permission denied', 403);
      }

      const updated: MerchantApplication = {
        ...existing,
        ...body,
        isDraft,
        status: isDraft
          ? 'DRAFT'
          : existing.status === 'DRAFT'
            ? 'SUBMITTED'
            : existing.status,
        updatedAt: now,
      } as MerchantApplication;

      const updatedApplications = [...applications];
      updatedApplications[idx] = updated;

      // Save before returning success.
      if (!persistApplications(updatedApplications)) {
        return error(
          'Unable to save application. Please try again.',
          500
        );
      }

      return ok(updated);
    }

    // Create new application.
    const newApp: MerchantApplication = {
      id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      businessName: body.businessName || '',
      businessType: body.businessType || '',
      registrationNumber: body.registrationNumber || '',
      industry: body.industry || '',
      website: body.website,
      contactName: body.contactName || '',
      contactEmail: body.contactEmail || '',
      contactPhone: body.contactPhone || '',
      addressLine1: body.addressLine1 || '',
      addressLine2: body.addressLine2,
      city: body.city || '',
      state: body.state || '',
      postalCode: body.postalCode || '',
      country: body.country || 'US',
      bankName: body.bankName || '',
      bankAccountNumber: body.bankAccountNumber || '',
      taxId: body.taxId || '',
      expectedMonthlyVolume: body.expectedMonthlyVolume || 0,
      status: isDraft ? 'DRAFT' : 'SUBMITTED',
      createdBy: user!.id,
      createdByName: user!.name,
      riskHistory: [],
      createdAt: now,
      updatedAt: now,
      isDraft,
    };

    // Persist new application before returning success.
    if (!persistApplications([newApp, ...applications])) {
      return error(
        'Unable to save application. Please try again.',
        500
      );
    }

    return ok(newApp);
  }

  // ---------- ADD RISK DECISION ----------

  const riskMatch = url.match(
    /\/api\/applications\/([^/]+)\/risk-decision$/
  );

  if (req.method === 'POST' && riskMatch) {
    if (user?.role !== 'REVIEWER' && user?.role !== 'ADMIN') {
      return error('Only reviewers can record decisions', 403);
    }

    const id = riskMatch[1];

    const { decision, comment } = req.body as {
      decision: string;
      comment: string;
    };

    const idx = applications.findIndex((a) => a.id === id);

    if (idx === -1) return error('Not found', 404);

    const existing = applications[idx];

    const risk: RiskDecision = {
      id: `risk_${Date.now()}`,
      decision: decision as any,
      comment,
      reviewerId: user.id,
      reviewerName: user.name,
      createdAt: new Date().toISOString(),
    };

    const updated: MerchantApplication = {
      ...existing,
      riskHistory: [...existing.riskHistory, risk],
      status:
        decision === 'APPROVE'
          ? 'APPROVED'
          : decision === 'REJECT'
            ? 'REJECTED'
            : 'IN_REVIEW',
      updatedAt: new Date().toISOString(),
    };

    const updatedApplications = [...applications];
    updatedApplications[idx] = updated;

    // Persist risk history and status before returning success.
    if (!persistApplications(updatedApplications)) {
      return error(
        'Unable to save review decision. Please try again.',
        500
      );
    }

    return ok({ ...updated });
  }

  // ---------- PASS THROUGH ----------

  return next(req);
};
