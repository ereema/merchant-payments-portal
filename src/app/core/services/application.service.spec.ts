import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ApplicationService } from './application.service';

describe('ApplicationService', () => {
  let service: ApplicationService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApplicationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should request applications with pagination params', () => {
    service.getApplications({ page: 1, pageSize: 10, status: 'SUBMITTED' }).subscribe((res) => {
      expect(res.items).toBeDefined();
    });

    const req = httpMock.expectOne((r) => r.url === '/api/applications');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('status')).toBe('SUBMITTED');
    req.flush({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 });
  });

  it('should post a new application', () => {
    const payload = { businessName: 'Test Co', isDraft: true };
    service.saveApplication(payload, true).subscribe();

    const req = httpMock.expectOne('/api/applications');
    expect(req.request.method).toBe('POST');
    expect(req.request.body.businessName).toBe('Test Co');
    req.flush({ id: 'app_1', ...payload });
  });
});
