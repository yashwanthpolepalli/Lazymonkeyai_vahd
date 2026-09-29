import { useCurrency } from "@/hooks/use-currency";

/**
 * Storefront API — connects to the public inventory endpoints that expose
 * products from ALL tenants (Amazon-style marketplace).
 *
 * The base URL is read from VITE_API_BASE_URL (set in frontend/.env).
 * No auth token is needed — these are public endpoints.
 */
const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}/inventory/public`;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StorefrontCategory {
  id: string;
  name: string;
  category_code?: string;
  description?: string;
  image_url?: string;
  item_count?: number;
  color?: string;
  icon?: string;
  is_active?: boolean;
}

export interface StorefrontProductImage {
  id: string;
  image_url: string;
  is_primary: boolean;
  display_order: number;
}

export interface StorefrontProductVariant {
  id: string;
  variant_name: string;
  sku: string;
  additional_price: number;
  stock_override: number | null;
  attributes: Record<string, string>;
}

export interface StorefrontProduct {
  id: string;
  name: string;
  sku: string;
  category_name?: string;
  brand?: string;
  short_description?: string;
  specifications?: any;
  image_url?: string;
  mrp: number;
  selling_price: number;
  stock: number;
  /** The business / tenant name that sells this product (shown as "Sold by: …") */
  seller_name?: string;
  tenant_id?: string;
  images?: StorefrontProductImage[];
  variants?: StorefrontProductVariant[];
}

// ─── API helpers ─────────────────────────────────────────────────────────────

/**
 * Resolves the currently active tenant ID from localStorage to ensure
 * Storefront displays only products belonging to the active business tenant.
 */
export function getActiveStorefrontTenantId(): string | null {
  try {
    const storedTenant = localStorage.getItem("bos-tenant");
    if (storedTenant) {
      const parsed = JSON.parse(storedTenant);
      const tid = parsed?.raw?.tenant_id || parsed?.tenant_id || parsed?.id;
      if (tid && tid !== "default" && typeof tid === "string" && tid.length > 10) return tid;
    }
    const storedAuth = localStorage.getItem("bos-auth");
    if (storedAuth) {
      const parsed = JSON.parse(storedAuth);
      const tid = parsed?.user?.tenantId || parsed?.user?.tenant_id;
      if (tid && tid !== "default" && typeof tid === "string" && tid.length > 10) return tid;
    }
  } catch (e) {}
  return null;
}

/**
 * Fetch active product categories for the active tenant.
 */
export const fetchStorefrontCategories = async (tenantId?: string): Promise<StorefrontCategory[]> => {
  const url = new URL(`${API_BASE_URL}/categories`);
  const headers: HeadersInit = {};
  if (tenantId) headers['X-Tenant-Id'] = tenantId;

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.status}`);
  }
  const data = await response.json();
  return data.items || [];
};

/**
 * Fetch products from the inventory catalog.
 * Pass categoryId/category name to filter by category, or search for a keyword.
 */
export const fetchStorefrontProducts = async (
  categoryId?: string,
  search?: string,
  tenantId?: string,
  page = 1,
  pageSize = 100,
): Promise<{ items: StorefrontProduct[]; total: number; page: number; page_size: number }> => {
  const url = new URL(`${API_BASE_URL}/products`);
  if (categoryId && categoryId !== "All") {
    url.searchParams.append('category', categoryId);
  }
  if (search && search.trim()) {
    url.searchParams.append('search', search.trim());
  }
  url.searchParams.append('page', String(page));
  url.searchParams.append('page_size', String(pageSize));

  const headers: HeadersInit = {};
  if (tenantId) headers['X-Tenant-Id'] = tenantId;

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status}`);
  }
  return response.json();
};

export const fetchStorefrontFlashDeals = async (limit = 4): Promise<StorefrontProduct[]> => {
  try {
    const res = await fetchStorefrontProducts(undefined, undefined, undefined, 1, 30);
    const items = res.items || [];
    return items
      .filter((p) => (p.mrp && p.selling_price && p.mrp > p.selling_price))
      .slice(0, limit);
  } catch (e) {
    return [];
  }
};

export const fetchStorefrontNotifications = async (): Promise<any[]> => {
  return [
    { id: 1, title: 'Welcome to LazyMonkeyAI', body: 'Explore our new smart features!', is_read: false, action_url: '/store' }
  ];
};

export const markStorefrontNotificationsRead = async (): Promise<{ success: boolean }> => {
  return { success: true };
};

export const fetchStorefrontUserContext = async (): Promise<any> => {
  const response = await fetch(`${API_BASE_URL.replace('/inventory', '/storefront')}/user-context`);
  if (!response.ok) throw new Error('Failed to fetch user context');
  return response.json();
};

export const fetchWalletTransactions = async (): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL.replace('/inventory', '/storefront')}/wallet/transactions`);
  if (!response.ok) throw new Error('Failed to fetch wallet transactions');
  return response.json();
};

export const topUpWallet = async (amount: number): Promise<any> => {
  const response = await fetch(`${API_BASE_URL.replace('/inventory', '/storefront')}/wallet/topup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount })
  });
  if (!response.ok) throw new Error('Failed to top up wallet');
  return response.json();
};

export const fetchWishlist = async (): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL.replace('/inventory', '/storefront')}/wishlist`);
  if (!response.ok) return [];
  return response.json();
};

export const addToWishlist = async (productId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL.replace('/inventory', '/storefront')}/wishlist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId })
  });
  if (!response.ok) throw new Error('Failed to add to wishlist');
  return response.json();
};

export const removeFromWishlist = async (productId: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL.replace('/inventory', '/storefront')}/wishlist/${productId}`, {
    method: 'DELETE'
  });
  if (!response.ok) throw new Error('Failed to remove from wishlist');
  return response.json();
};
export const fetchStorefrontProductById = async (productId: string): Promise<StorefrontProduct> => {
  const response = await fetch(`${API_BASE_URL}/products/${productId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch product: ${response.status}`);
  }
  return response.json();
};

export const createStorefrontOrder = async (orderData: {
  customer_name: string;
  customer_id?: string;
  customer_email?: string;
  customer_phone?: string;
  total_amount: number;
  delivery_partner?: string;
  expected_delivery?: string;
  items?: Array<{ product_id: string; name: string; quantity: number; price: number }>;
  payment_method?: string;
  shipping_address?: string;
  notes?: string;
}): Promise<any> => {
  const rootBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
  const marketplaceBase = `${rootBase}/marketplace`;
  const tid = getActiveStorefrontTenantId();
  
  const payload = {
    ...orderData,
    tenant_id: tid,
    channel: "Online Storefront",
    source: "Storefront Online",
    created_at: new Date().toISOString()
  };

  const response = await fetch(`${marketplaceBase}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (response.ok) {
    return await response.json();
  }
  const errorBody = await response.json().catch(() => ({}));
  throw new Error(errorBody.detail || "Failed to place order and reserve stock.");
};

export const fetchStorefrontUserOrders = async (customerEmail?: string, customerId?: string): Promise<any[]> => {
  const rootBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
  const url = new URL(`${rootBase}/marketplace/orders`);
  if (customerEmail) url.searchParams.append('customer_email', customerEmail);
  if (customerId) url.searchParams.append('customer_id', customerId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to fetch orders: ${res.status}`);
  return res.json();
};

export const fetchStorefrontOrderById = async (orderId: string): Promise<any> => {
  const rootBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
  const res = await fetch(`${rootBase}/marketplace/orders/${orderId}`);
  if (!res.ok) throw new Error(`Failed to fetch order: ${res.status}`);
  return res.json();
};

import { resolveImageUrl } from "@/lib/api-client";

/**
 * Maps a backend StorefrontProduct to the OrganicProduct format used by the UI components.
 */
export const mapStorefrontToOrganic = (p: StorefrontProduct, index = 0): any => {
  const sp = Number(p.selling_price ?? p.mrp ?? 0);
  const mrp = Number(p.mrp ?? p.selling_price ?? 0);
  const discountVal = mrp > sp && mrp > 0
    ? Math.round(((mrp - sp) / mrp) * 100)
    : 0;

  let resolvedImage = p.image_url ? resolveImageUrl(p.image_url) : "";
  if (!resolvedImage || resolvedImage.trim() === "" || resolvedImage === "/placeholder.svg") {
    resolvedImage = `/organic/images/product-thumb-${(index % 12) + 1}.png`;
  }

  return {
    id: String(p.id),
    name: p.name,
    category: p.category_name || "General",
    image: resolvedImage,
    price: sp,
    originalPrice: mrp,
    discountBadge: discountVal > 0 ? `${discountVal}% OFF` : undefined,
    rating: 4.8,
    reviewsCount: 24,
    unit: p.specifications?.weight || p.specifications?.unit || (p.sku ? `SKU: ${p.sku}` : "1 unit"),
    description: p.short_description || `${p.name} - Verified inventory product.`,
    inStock: (p.stock ?? 0) > 0,
    stock: p.stock ?? 0,
    sellerName: p.seller_name || "Verified Store",
    brand: p.brand,
    sku: p.sku,
  };
};
