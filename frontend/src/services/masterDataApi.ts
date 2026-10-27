import { apiClient } from './apiClient';
import { MasterDataItem } from '@/components/settings/MasterDataSettings';

export const masterDataApi = {
  getAll: async (category?: string): Promise<Record<string, MasterDataItem[]>> => {
    try {
      const res = await apiClient.get<Record<string, MasterDataItem[]> | MasterDataItem[]>('/settings/master-data', {
        params: category ? { category } : undefined,
      });
      if (category) {
        return { [category]: Array.isArray(res) ? res : [] };
      }
      return (res && typeof res === 'object' && !Array.isArray(res)) ? (res as Record<string, MasterDataItem[]>) : {};
    } catch {
      return {};
    }
  },

  getByCategory: async (category: string): Promise<MasterDataItem[]> => {
    try {
      const res = await apiClient.get<MasterDataItem[]>(`/settings/master-data/${category}`);
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },

  create: async (category: string, item: Partial<MasterDataItem>): Promise<MasterDataItem> => {
    return apiClient.post<MasterDataItem>(`/settings/master-data/${category}`, item);
  },

  update: async (category: string, itemId: string, item: Partial<MasterDataItem>): Promise<MasterDataItem> => {
    return apiClient.put<MasterDataItem>(`/settings/master-data/${category}/${itemId}`, item);
  },

  delete: async (category: string, itemId: string): Promise<{ message: string; id: string }> => {
    return apiClient.delete<{ message: string; id: string }>(`/settings/master-data/${category}/${itemId}`);
  },
};
