import { posApi as clientPosApi, POSTransactionHistory } from "./api-client";

export interface ApiError {
  status: number;
  detail: string;
}

export interface POSDailySummary {
  transactions_count: number;
  total_revenue: number;
  total_returns: number;
  breakdown: {
    cash: number;
    card: number;
    upi: number;
    wallet?: number;
    credit?: number;
  };
  split_count: number;
  hourly_sales?: {
    hour: string;
    revenue: number;
    orders: number;
  }[];
}

export type POSTransaction = POSTransactionHistory;

export const posApi = {
  getDailySummary: async (params?: { session_id?: string }): Promise<POSDailySummary> => {
    return clientPosApi.getDailySummary(params);
  },
  
  getTransactionHistory: async (limit: number = 50): Promise<POSTransaction[]> => {
    return clientPosApi.getHistory({ limit });
  }
};
