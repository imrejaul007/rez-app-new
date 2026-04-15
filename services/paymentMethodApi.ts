// Payment Method API Service
// Handles payment methods (cards, bank accounts, UPI) management

import apiClient, { ApiResponse } from './apiClient';

export enum PaymentMethodType {
  CARD = 'CARD',
  BANK_ACCOUNT = 'BANK_ACCOUNT',
  UPI = 'UPI',
  WALLET = 'WALLET'
}

export enum CardType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT'
}

export enum CardBrand {
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  AMEX = 'AMEX',
  RUPAY = 'RUPAY',
  DISCOVER = 'DISCOVER',
  OTHER = 'OTHER'
}

export enum BankAccountType {
  SAVINGS = 'SAVINGS',
  CURRENT = 'CURRENT'
}

export interface CardDetails {
  type: CardType;
  brand: CardBrand;
  lastFourDigits: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
  nickname?: string;
}

export interface BankAccountDetails {
  bankName: string;
  accountType: BankAccountType;
  accountNumber: string; // Will be masked
  ifscCode: string;
  nickname?: string;
  isVerified: boolean;
}

export interface UPIDetails {
  vpa: string;
  nickname?: string;
  isVerified: boolean;
}

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  card?: CardDetails;
  bankAccount?: BankAccountDetails;
  upi?: UPIDetails;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentMethodCreate {
  type: PaymentMethodType;
  card?: Omit<CardDetails, 'lastFourDigits'> & { cardNumber: string };
  bankAccount?: BankAccountDetails;
  upi?: UPIDetails;
  isDefault?: boolean;
}

export interface PaymentMethodUpdate {
  card?: Partial<CardDetails>;
  bankAccount?: Partial<BankAccountDetails>;
  upi?: Partial<UPIDetails>;
  isDefault?: boolean;
}

class PaymentMethodApiService {
  private baseUrl = '/payment-methods';

  // Get all user payment methods
  async getUserPaymentMethods(): Promise<ApiResponse<PaymentMethod[]>> {
    return apiClient.get<any>(this.baseUrl);
  }

  // Get single payment method by ID
  async getPaymentMethodById(id: string): Promise<ApiResponse<PaymentMethod>> {
    return apiClient.get<any>(`${this.baseUrl}/${id}`);
  }

  // Create new payment method
  async createPaymentMethod(data: PaymentMethodCreate): Promise<ApiResponse<PaymentMethod>> {
    return apiClient.post<any>(this.baseUrl, data as any);
  }

  // Update payment method
  async updatePaymentMethod(id: string, data: PaymentMethodUpdate): Promise<ApiResponse<PaymentMethod>> {
    return apiClient.put<any>(`${this.baseUrl}/${id}`, data as any);
  }

  // Delete payment method (soft delete)
  async deletePaymentMethod(id: string): Promise<ApiResponse<{ deletedId: string }>> {

    const response = await apiClient.delete<any>(`${this.baseUrl}/${id}`);

    return response as ApiResponse<{ deletedId: string }>;
  }

  // Set default payment method
  async setDefaultPaymentMethod(id: string): Promise<ApiResponse<PaymentMethod>> {
    return apiClient.patch<any>(`${this.baseUrl}/${id}/default`, {});
  }
}

export const paymentMethodApi = new PaymentMethodApiService();
export default paymentMethodApi;