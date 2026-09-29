import { useState, useEffect } from "react";
import { useTenant } from "@/contexts/tenant-context";
import { crmOpportunitiesApi, crmLeadsApi, crmTicketsApi, crmQuotationsApi, type CrmOpportunity, type CrmLead, type CrmTicket, type CrmQuotation } from "@/lib/api-client";

export interface CrmData {
  mockCrmStats: Record<string, unknown>;
  mockCustomers: any[];
  mockDeals: CrmOpportunity[];
  mockLeads: CrmLead[];
  mockTickets: CrmTicket[];
  mockQuotations: CrmQuotation[];
  // Customer-intelligence mock properties (empty arrays until real endpoints exist)
  mockCustomerSegments: any[];
  mockLoyaltyRewards: any[];
  mockMembershipPlans: any[];
  mockWalletTransactions: any[];
  mockCustomerGroups: any[];
  mockCustomerDocuments: any[];
  mockAiRecommendations: any[];
}

export function useCrmData(): CrmData {
  const { tenant } = useTenant();
  const [mockCrmStats, setMockCrmStats] = useState<Record<string, unknown>>({});
  const [mockCustomers, setMockCustomers] = useState<any[]>([]);
  const [mockDeals, setMockDeals] = useState<CrmOpportunity[]>([]);
  const [mockLeads, setMockLeads] = useState<CrmLead[]>([]);
  const [mockTickets, setMockTickets] = useState<CrmTicket[]>([]);
  const [mockQuotations, setMockQuotations] = useState<CrmQuotation[]>([]);

  // Customer-intelligence stubs (no backend endpoints yet)
  const mockCustomerSegments: any[] = [];
  const mockLoyaltyRewards: any[] = [];
  const mockMembershipPlans: any[] = [];
  const mockWalletTransactions: any[] = [];
  const mockCustomerGroups: any[] = [];
  const mockCustomerDocuments: any[] = [];
  const mockAiRecommendations: any[] = [];

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [deals, leadsRes, tickets, quotations] = await Promise.all([
          crmOpportunitiesApi.list(),
          crmLeadsApi.list(),
          crmTicketsApi.list(),
          crmQuotationsApi.list(),
        ]);

        const dealsArr: CrmOpportunity[] = Array.isArray(deals) ? deals : [];
        // crmLeadsApi.list() returns PaginatedResponse<CrmLead>
        const leadsArr: CrmLead[] = Array.isArray(leadsRes)
          ? leadsRes
          : (leadsRes as any)?.items ?? [];
        const ticketsArr: CrmTicket[] = Array.isArray(tickets) ? tickets : [];
        const quotationsArr: CrmQuotation[] = Array.isArray(quotations)
          ? quotations
          : (quotations as any)?.items ?? [];

        setMockDeals(dealsArr);
        setMockLeads(leadsArr);
        setMockTickets(ticketsArr);
        setMockQuotations(quotationsArr);
        setMockCrmStats({
          totalCustomers: 0,
          totalRevenue: dealsArr.reduce((sum, d) => sum + Number(d.amount), 0),
        });
        setMockCustomers([]);
      } catch (err) {
        console.error("Failed to load CRM data:", err);
      }
    };
    fetchAll();
  }, [tenant?.id]);

  return {
    mockCrmStats,
    mockCustomers,
    mockDeals,
    mockLeads,
    mockTickets,
    mockQuotations,
    mockCustomerSegments,
    mockLoyaltyRewards,
    mockMembershipPlans,
    mockWalletTransactions,
    mockCustomerGroups,
    mockCustomerDocuments,
    mockAiRecommendations,
  };
}
