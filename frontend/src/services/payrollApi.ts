import { apiClient } from './apiClient';

export interface PayrollInvoice {
  id: string;
  trainer_id: string;
  trainer_name?: string;
  month_year: string;
  days_present: number;
  total_days_in_month: number;
  base_monthly_salary: number;
  base_salary_earned: number;
  commission_earned: number;
  net_salary: number;
  status: 'PENDING' | 'PAID';
  payment_method?: string;
  transaction_reference?: string;
  paid_at?: string;
  created_at?: string;
}

export const payrollApi = {
  listInvoices: async (): Promise<PayrollInvoice[]> => {
    try {
      const res = await apiClient.get<PayrollInvoice[]>('/payroll/invoices');
      return Array.isArray(res) ? res : [];
    } catch (_err) {
      return [];
    }
  },
  generateInvoice: async (data: { trainer_id: string; month_year: string; pt_sessions_count?: number }): Promise<PayrollInvoice> => {
    return apiClient.post<PayrollInvoice>('/payroll/generate', data);
  },
  processPayment: async (payrollId: string, data: { payment_method: string; transaction_reference?: string }): Promise<PayrollInvoice> => {
    return apiClient.post<PayrollInvoice>(`/payroll/${payrollId}/pay`, data);
  },
};
