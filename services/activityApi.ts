// Activity API Service
// Handles user activity feed

import apiClient, { ApiResponse } from './apiClient';

export enum ActivityType {
  ORDER = 'ORDER',
  CASHBACK = 'CASHBACK',
  REVIEW = 'REVIEW',
  VIDEO = 'VIDEO',
  PROJECT = 'PROJECT',
  VOUCHER = 'VOUCHER',
  OFFER = 'OFFER',
  REFERRAL = 'REFERRAL',
  WALLET = 'WALLET',
  ACHIEVEMENT = 'ACHIEVEMENT'
}

export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  title: string;
  description?: string;
  amount?: number;
  icon: string;
  color: string;
  relatedEntity?: {
    id: string;
    type: string;
  };
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityCreate {
  type: ActivityType;
  title: string;
  description?: string;
  amount?: number;
  icon?: string;
  color?: string;
  relatedEntity?: {
    id: string;
    type: string;
  };
  metadata?: Record<string, any>;
}

export interface ActivityPagination {
  activities: Activity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ActivitySummary {
  summary: {
    type: ActivityType;
    count: number;
    totalAmount: number;
  }[];
  totalActivities: number;
}

class ActivityApiService {
  private baseUrl = '/activities';
  private seenActivityIds: Set<string> = new Set(); // CA-GAM-047: Track seen activities for deduplication

  // Get user activities with pagination
  async getUserActivities(page = 1, limit = 20, type?: ActivityType): Promise<ApiResponse<ActivityPagination>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(type && { type })
    });
    const response = await apiClient.get<ActivityPagination>(`${this.baseUrl}?${params.toString()}`);

    // CA-GAM-047: Deduplicate activities if response is successful
    if (response.success && response.data?.activities) {
      const uniqueActivities = response.data.activities.filter((activity) => {
        if (this.seenActivityIds.has(activity.id)) {
          return false; // Skip duplicate
        }
        this.seenActivityIds.add(activity.id);
        return true;
      });

      return {
        ...response,
        data: {
          ...response.data,
          activities: uniqueActivities
        }
      };
    }

    return response;
  }

  // Get activity by ID
  async getActivityById(id: string): Promise<ApiResponse<Activity>> {
    return apiClient.get(`${this.baseUrl}/${id}`);
  }

  // Get activity summary by type
  async getActivitySummary(): Promise<ApiResponse<ActivitySummary>> {
    return apiClient.get(`${this.baseUrl}/summary`);
  }

  // Create activity (typically called by system)
  async createActivity(data: ActivityCreate): Promise<ApiResponse<Activity>> {
    return apiClient.post(this.baseUrl, data);
  }

  // Batch create activities (for importing historical data)
  async batchCreateActivities(activities: ActivityCreate[]): Promise<ApiResponse<Activity[]>> {
    return apiClient.post(`${this.baseUrl}/batch`, { activities });
  }

  // Delete activity
  async deleteActivity(id: string): Promise<ApiResponse<{ deletedId: string }>> {
    return apiClient.delete(`${this.baseUrl}/${id}`);
  }

  // Clear all activities
  async clearAllActivities(): Promise<ApiResponse<{ deletedCount: number }>> {
    return apiClient.delete(this.baseUrl);
  }
}

export const activityApi = new ActivityApiService();
export default activityApi;