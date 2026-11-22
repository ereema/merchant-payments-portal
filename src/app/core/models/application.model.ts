export type ApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'REJECTED';

export interface RiskDecision {
  id: string;
  decision: 'APPROVE' | 'REJECT' | 'REQUEST_INFO';
  comment: string;
  reviewerId: string;
  reviewerName: string;
  createdAt: string;
}

export interface MerchantApplication {
  id: string;
  // Step 1 - Business Info
  businessName: string;
  businessType: string;
  registrationNumber: string;
  industry: string;
  website?: string;

  // Step 2 - Contact & Address
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;

  // Step 3 - Banking & Sensitive
  bankName: string;
  bankAccountNumber: string; // sensitive - mask
  taxId: string; // sensitive - mask
  expectedMonthlyVolume: number;

  // Meta
  status: ApplicationStatus;
  createdBy: string;
  createdByName: string;
  assignedReviewerId?: string;
  assignedReviewerName?: string;
  riskHistory: RiskDecision[];
  createdAt: string;
  updatedAt: string;
  isDraft: boolean;
}

export interface ApplicationListParams {
  page: number;
  pageSize: number;
  status?: ApplicationStatus | '';
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
