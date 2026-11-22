import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  MerchantApplication,
  ApplicationListParams,
  PagedResult,
} from '../models/application.model';

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private http = inject(HttpClient);
  private base = '/api/applications';

  getApplications(params: ApplicationListParams): Observable<PagedResult<MerchantApplication>> {
    let httpParams = new HttpParams()
      .set('page', params.page)
      .set('pageSize', params.pageSize);

    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.sortBy) httpParams = httpParams.set('sortBy', params.sortBy);
    if (params.sortDir) httpParams = httpParams.set('sortDir', params.sortDir);

    return this.http.get<PagedResult<MerchantApplication>>(this.base, { params: httpParams });
  }

  getById(id: string): Observable<MerchantApplication> {
    return this.http.get<MerchantApplication>(`${this.base}/${id}`);
  }

  saveApplication(
    data: Partial<MerchantApplication>,
    isDraft = true
  ): Observable<MerchantApplication> {
    return this.http.post<MerchantApplication>(this.base, { ...data, isDraft });
  }

  addRiskDecision(
    appId: string,
    decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO',
    comment: string
  ): Observable<MerchantApplication> {
    return this.http.post<MerchantApplication>(`${this.base}/${appId}/risk-decision`, {
      decision,
      comment,
    });
  }
}
