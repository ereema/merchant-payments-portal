import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should login successfully and set user', () => {
    const mockResponse = {
      accessToken: 'fake-token',
      refreshToken: 'fake-refresh',
      user: { id: 'u1', email: 'sales@demo.com', name: 'Alex Sales', role: 'SALES' as const },
      expiresIn: 3600,
    };

    service.login('sales@demo.com', 'sales123').subscribe((res) => {
      expect(res.user.role).toBe('SALES');
      expect(service.isAuthenticated()).toBe(true);
      expect(service.role()).toBe('SALES');
    });

    const req = httpMock.expectOne('/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('should call /auth/refresh when refreshToken is invoked', () => {
    localStorage.setItem('mpp_refresh', 'some-refresh-token');
    localStorage.setItem(
      'mpp_auth',
      JSON.stringify({
        accessToken: 'old',
        user: { id: 'u1', email: 'sales@demo.com', name: 'Alex', role: 'SALES' },
      })
    );

    // re-create so it loads the token
    service = TestBed.inject(AuthService);

    service.refreshToken().subscribe((token) => {
      expect(token).toBe('new-access-token');
    });

    const req = httpMock.expectOne('/auth/refresh');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken: 'some-refresh-token' });
    req.flush({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh',
      user: { id: 'u1', email: 'sales@demo.com', name: 'Alex', role: 'SALES' },
      expiresIn: 3600,
    });
  });
});
