// Finance API Service
// REZ Finance — Borrow, Credit Score, BNPL, Bill Pay

import apiClient, { ApiResponse } from './apiClient';

// ── Types ──────────────────────────────────────────────────────────────────

export interface PartnerOffer {
  _id: string;
  partnerId: string;
  type: 'personal_loan' | 'instant_loan' | 'credit_card' | 'bnpl' | 'merchant_finance';
  displayName: string;
  logoUrl?: string;
  minAmount?: number;
  maxAmount?: number;
  minTenure?: number;
  maxTenure?: number;
  interestRate?: number;
  processingFee?: number;
  creditLimit?: number;
  annualFee?: number;
  isPreApproved: boolean;
  expiresAt: string;
  coinsOnApproval: number;
}

export interface LoanApplication {
  _id: string;
  type: string;
  amount: number;
  tenure: number;
  status: 'pending' | 'pre_approved' | 'submitted' | 'under_review' | 'approved' | 'disbursed' | 'rejected';
  interestRate?: number;
  emi?: number;
  coinsAwarded: number;
  createdAt: string;
}

export interface CreditScore {
  rezScore: number;
  bureauScore?: number;
  eligibility: {
    maxLoanAmount: number;
    maxCreditCardLimit: number;
    bnplEnabled: boolean;
    bnplLimit: number;
  };
  tips: string[];
  updatedAt: string;
}

export interface ContextualOffer {
  eligible: boolean;
  message?: string;
  offerType?: string;
  limit?: number;
}

export interface FinanceTransaction {
  _id: string;
  type: string;
  status: string;
  amount: number;
  operator?: string;
  billerId?: string;
  createdAt: string;
}

// ── Service ────────────────────────────────────────────────────────────────

class FinanceApiService {
  private base = '/finance';

  // BORROW
  async getOffers(): Promise<ApiResponse<{ offers: PartnerOffer[] }>> {
    return apiClient.get<{ offers: PartnerOffer[] }>(`${this.base}/borrow/offers`);
  }

  async applyForLoan(params: {
    partnerOfferId: string;
    amount: number;
    tenure: number;
    context?: { screen: string; orderId?: string; bookingId?: string };
  }): Promise<ApiResponse<{ application: LoanApplication; redirectUrl?: string }>> {
    return apiClient.post<{ application: LoanApplication; redirectUrl?: string }>(`${this.base}/borrow/apply`, params);
  }

  async getApplications(): Promise<ApiResponse<{ applications: LoanApplication[] }>> {
    return apiClient.get<{ applications: LoanApplication[] }>(`${this.base}/borrow/applications`);
  }

  // BNPL (contextual — called from checkout)
  async checkBnpl(amount: number, orderId: string): Promise<ApiResponse<ContextualOffer>> {
    return apiClient.post<ContextualOffer>(`${this.base}/borrow/bnpl/check`, { amount, orderId });
  }

  async createBnplOrder(params: {
    amount: number;
    orderId: string;
    merchantId?: string;
  }): Promise<ApiResponse<{ transaction: FinanceTransaction }>> {
    return apiClient.post<{ transaction: FinanceTransaction }>(`${this.base}/borrow/bnpl/create`, params);
  }

  // CREDIT SCORE
  async getScore(): Promise<ApiResponse<CreditScore>> {
    return apiClient.get<CreditScore>(`${this.base}/credit/score`);
  }

  async checkScoreAndEarnCoins(): Promise<ApiResponse<{ rezScore: number; coinsAwarded: number }>> {
    return apiClient.post<{ rezScore: number; coinsAwarded: number }>(`${this.base}/credit/score/check`, {});
  }

  async refreshScore(): Promise<ApiResponse<CreditScore>> {
    return apiClient.post<CreditScore>(`${this.base}/credit/score/refresh`, {});
  }

  // PAY & MANAGE
  async getBillers(): Promise<ApiResponse<{ billers: { id: string; name: string; type: string }[] }>> {
    return apiClient.get<{ billers: { id: string; name: string; type: string }[] }>(`${this.base}/pay/billers`);
  }

  async payBill(params: {
    billerId: string;
    accountNumber: string;
    amount: number;
  }): Promise<ApiResponse<{ transaction: FinanceTransaction }>> {
    return apiClient.post<{ transaction: FinanceTransaction }>(`${this.base}/pay/bill`, params);
  }

  async recharge(params: {
    operator: string;
    accountNumber: string;
    amount: number;
  }): Promise<ApiResponse<{ transaction: FinanceTransaction }>> {
    return apiClient.post<{ transaction: FinanceTransaction }>(`${this.base}/pay/recharge`, params);
  }

  async getPayTransactions(): Promise<ApiResponse<{ transactions: FinanceTransaction[] }>> {
    return apiClient.get<{ transactions: FinanceTransaction[] }>(`${this.base}/pay/transactions`);
  }
}

const financeApi = new FinanceApiService();
export default financeApi;
