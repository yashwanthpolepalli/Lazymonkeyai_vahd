import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useCurrency } from "@/hooks/use-currency";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export interface AuthRole {
  id: string;
  name: string;
  is_default: boolean;
  description?: string;
  permissions?: string[];
  enabled_modules?: string[] | null;
  enabled_tabs?: string[] | null;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  status: "Active" | "Inactive";
  tenantId: string | null;
  tenantSlug: string | null;
  tenantName?: string | null;
  isTenantOwner: boolean;
  isPlatformAdmin: boolean;
  permissions: string[];
  roles: AuthRole[];
  assignedRoles: string[];
  defaultRole: string;
  activeRoleId: string | null;
  mustChangePassword: boolean;
  enabledModules?: string[];
}



interface LoginPayload {
  email: string;
  password: string;
  tenant_slug?: string;
}

interface RegisterPayload {
  tenant_name: string;
  tenant_slug?: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
  company_name: string;
}

interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  must_change_password?: boolean;
  requires_role_selection?: boolean;
  active_role_id?: string;
  assigned_roles?: AuthRole[];
}

interface StoredAuth {
  user: AppUser;
  accessToken: string;
  refreshToken?: string;
}

interface AuthCtx {
  user: AppUser | null;
  accessToken: string | null;
  isAuthed: boolean;
  authReady: boolean;
  login: (payload: LoginPayload) => Promise<{ user: AppUser; token: TokenResponse }>;
  register: (payload: RegisterPayload) => Promise<{ user: AppUser; token: TokenResponse }>;
  selectRole: (roleId: string) => Promise<{ user: AppUser; token: TokenResponse }>;
  changePassword: (payload: ChangePasswordPayload) => Promise<{ user: AppUser; token: TokenResponse }>;
  applySession: (user: AppUser, accessToken: string, refreshToken?: string) => void;
  loginWithToken: (tokenData: TokenResponse) => Promise<{ user: AppUser; token: TokenResponse }>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

async function parseError(response: Response): Promise<string> {
  let detail = "Authentication request failed";
  try {
    const json = (await response.json()) as {
      detail?: string | { msg?: string }[];
      message?: string;
    };
    if (typeof json.detail === "string") detail = json.detail;
    else if (Array.isArray(json.detail)) detail = json.detail.map((item: { msg?: string }) => item.msg).join(", ");
    else if (json.message) detail = json.message;
  } catch {
    /* ignore */
  }
  return detail;
}

function buildAvatar(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function mapUser(json: Record<string, unknown>): AppUser {
  const roles = (json.roles as AuthRole[] | undefined) ?? [];
  return {
    id: String(json.id),
    tenantId: json.tenant_id ? String(json.tenant_id) : null,
    tenantSlug: json.tenant_slug ? String(json.tenant_slug) : null,
    tenantName: json.tenant_name ? String(json.tenant_name) : null,
    name: String(json.full_name ?? ""),
    email: String(json.email ?? ""),
    avatar: String(json.avatar_initials || buildAvatar(String(json.full_name ?? json.email ?? ""))),
    status: json.status === "active" ? "Active" : "Inactive",
    isTenantOwner: Boolean(json.is_tenant_owner),
    isPlatformAdmin: Boolean(json.is_platform_admin),
    permissions: (json.permissions as string[] | undefined) ?? [],
    roles,
    assignedRoles: roles.map((role) => role.id),
    defaultRole: roles.find((role) => role.is_default)?.id ?? roles[0]?.id ?? "",
    activeRoleId: json.active_role_id ? String(json.active_role_id) : null,
    mustChangePassword: Boolean(json.must_change_password),
    enabledModules: (json.enabled_modules as string[] | undefined) ?? [],
  };
}



function getInitialStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("bos-auth");
    if (!stored) return null;
    const parsed: StoredAuth = JSON.parse(stored);
    if (!parsed?.accessToken || !parsed?.user) return null;

    // Fast fail if token is expired
    try {
      const payload = JSON.parse(atob(parsed.accessToken.split(".")[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("bos-auth");
        localStorage.removeItem("bos-active-role");
        return null;
      }
    } catch {
      // Ignore parse errors
    }
    return parsed;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { currency, formatCurrency } = useCurrency();
  const initialAuth = getInitialStoredAuth();

  const [user, setUser] = useState<AppUser | null>(() => initialAuth?.user ?? null);
  const [accessToken, setAccessToken] = useState<string | null>(() => initialAuth?.accessToken ?? null);
  const [refreshToken, setRefreshToken] = useState<string | null>(() => initialAuth?.refreshToken ?? null);
  const [authReady, setAuthReady] = useState(() => initialAuth !== null);

  const persistAuth = (nextUser: AppUser, nextAccessToken: string, nextRefreshToken?: string | null) => {
    const stored: StoredAuth = { user: nextUser, accessToken: nextAccessToken, refreshToken: nextRefreshToken || undefined };
    localStorage.setItem("bos-auth", JSON.stringify(stored));
  };

  const applySession = (nextUser: AppUser, nextAccessToken: string, nextRefreshToken?: string | null) => {
    setUser(nextUser);
    setAccessToken(nextAccessToken);
    setRefreshToken(nextRefreshToken || null);
    persistAuth(nextUser, nextAccessToken, nextRefreshToken);
  };

  const clearAuthQueryParams = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("access_token");
    url.searchParams.delete("refresh_token");
    url.searchParams.delete("expires_in");
    window.history.replaceState({}, "", url.pathname + url.search);
  };

  const fetchUser = async (token: string): Promise<AppUser> => {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(await parseError(response));
    return mapUser(await response.json());
  };

  const hydrateFromTokens = async (tokenData: TokenResponse) => {
    const currentUser = await fetchUser(tokenData.access_token);
    // Merge must_change_password from token (more up to date than /me during password change)
    const merged: AppUser = {
      ...currentUser,
      mustChangePassword: tokenData.must_change_password ?? currentUser.mustChangePassword,
    };
    applySession(merged, tokenData.access_token, tokenData.refresh_token);
    return { user: merged, token: tokenData };
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthAccessToken = params.get("access_token");
    const oauthRefreshToken = params.get("refresh_token");

    const validateSessionInBackground = async () => {
      const currentToken = accessToken || initialAuth?.accessToken;
      if (!currentToken) {
        setAuthReady(true);
        return;
      }

      try {
        const currentUser = await fetchUser(currentToken);
        setUser(currentUser);
        persistAuth(currentUser, currentToken, refreshToken || initialAuth?.refreshToken);
      } catch (err: any) {
        // If the backend specifically rejected the token as unauthorized (401), clear auth
        if (err?.message?.includes("Could not validate credentials") || err?.message?.includes("Invalid token") || err?.message?.includes("401")) {
          localStorage.removeItem("bos-auth");
          localStorage.removeItem("bos-active-role");
          setUser(null);
          setAccessToken(null);
          setRefreshToken(null);
        }
      } finally {
        setAuthReady(true);
      }
    };

    if (oauthAccessToken && oauthRefreshToken) {
      void hydrateFromTokens({
        access_token: oauthAccessToken,
        refresh_token: oauthRefreshToken,
        token_type: "bearer",
        expires_in: 0,
      })
        .catch(() => localStorage.removeItem("bos-auth"))
        .finally(() => {
          clearAuthQueryParams();
          setAuthReady(true);
        });
      return;
    }

    void validateSessionInBackground();
  }, []);

  const refreshUser = async () => {
    if (!accessToken) return;
    try {
      const refreshed = await fetchUser(accessToken);
      setUser(refreshed);
      persistAuth(refreshed, accessToken, refreshToken);
    } catch (e) {
      console.warn("Failed to refresh user auth state:", e);
    }
  };

  useEffect(() => {
    const handleModulesChanged = () => {
      void refreshUser();
    };
    window.addEventListener("bos-modules-changed", handleModulesChanged);
    window.addEventListener("bos-tenant-changed", handleModulesChanged);
    return () => {
      window.removeEventListener("bos-modules-changed", handleModulesChanged);
      window.removeEventListener("bos-tenant-changed", handleModulesChanged);
    };
  }, [accessToken, refreshToken]);

  const login = async (payload: LoginPayload) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await parseError(response));
    return hydrateFromTokens(await response.json());
  };

  const register = async (payload: RegisterPayload) => {
    const response = await fetch(`${API_BASE_URL}/auth/register-tenant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await parseError(response));
    return hydrateFromTokens(await response.json());
  };

  const selectRole = async (roleId: string) => {
    if (!accessToken) throw new Error("Not authenticated");
    const response = await fetch(`${API_BASE_URL}/auth/select-role`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role_id: roleId }),
    });
    if (!response.ok) throw new Error(await parseError(response));
    const tokenData: TokenResponse = await response.json();
    const currentUser = await fetchUser(tokenData.access_token);
    applySession(currentUser, tokenData.access_token, tokenData.refresh_token);
    localStorage.setItem("bos-active-role", roleId);
    return { user: currentUser, token: tokenData };
  };

  const changePassword = async (payload: ChangePasswordPayload) => {
    if (!accessToken) throw new Error("Not authenticated");
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await parseError(response));
    const tokenData: TokenResponse = await response.json();
    return hydrateFromTokens(tokenData);
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    localStorage.removeItem("bos-auth");
    localStorage.removeItem("bos-active-role");
    localStorage.removeItem("bos-tenant");
    localStorage.removeItem("bos-branch");
    localStorage.removeItem("bos_active_company");
    localStorage.removeItem("bos_selected_company");
    localStorage.removeItem("bos_active_billing_gst_details");
    localStorage.removeItem("bos_current_tenant");
  };

  // Auto-refresh the access token periodically so the session never expires as
  // long as the user is logged in. No inactivity logout — sessions persist
  // until the user clicks "Log out" themselves.
  useEffect(() => {
    if (!user || !refreshToken) return;

    const refreshSession = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!response.ok) {
          // Refresh token rejected — leave the current session alone, do NOT
          // log the user out. The user can decide to log out themselves.
          return;
        }
        const tokenData: TokenResponse = await response.json();
        try {
          const refreshedUser = await fetchUser(tokenData.access_token);
          applySession(refreshedUser, tokenData.access_token, tokenData.refresh_token);
        } catch {
          // /me failed — still keep the new tokens so the session survives
          setAccessToken(tokenData.access_token);
          setRefreshToken(tokenData.refresh_token || null);
          persistAuth(user, tokenData.access_token, tokenData.refresh_token);
        }
      } catch {
        /* network hiccup — keep the existing session */
      }
    };

    // Refresh every 14 minutes so a long-lived tab always has a fresh token
    const interval = setInterval(refreshSession, 14 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, refreshToken]);

  return (
    <Ctx.Provider
      value={{
        user,
        accessToken,
        isAuthed: !!user,
        authReady,
        login,
        register,
        selectRole,
        changePassword,
        applySession,
        loginWithToken: hydrateFromTokens,
        refreshUser,
        logout,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) {
    let storedUser: any = null;
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      if (raw) storedUser = JSON.parse(raw);
    } catch {}

    const appRole: AuthRole = {
      id: "role_admin",
      name: "owner",
      is_default: true,
      permissions: ["*"],
    };

    const appUser: AppUser = {
      id: storedUser?.id || "user_default",
      email: storedUser?.email || "admin@vahd.com",
      name: storedUser?.name || "Admin",
      avatar: storedUser?.avatar || buildAvatar(storedUser?.name || "Admin"),
      status: storedUser?.status || "Active",
      tenantId: storedUser?.tenantId || null,
      tenantSlug: storedUser?.tenantSlug || null,
      tenantName: storedUser?.tenantName || null,
      isTenantOwner: true,
      isPlatformAdmin: true,
      permissions: storedUser?.permissions || ["*"],
      roles: storedUser?.roles || [appRole],
      assignedRoles: storedUser?.assignedRoles || ["role_admin"],
      defaultRole: storedUser?.defaultRole || "role_admin",
      activeRoleId: storedUser?.activeRoleId || "role_admin",
      mustChangePassword: false,
      enabledModules: storedUser?.enabledModules || [],
    };

    return {
      user: appUser,
      accessToken: null,
      isAuthed: true,
      authReady: true,
      login: async () => ({ user: appUser, token: { access_token: "" } }),
      register: async () => ({ user: appUser, token: { access_token: "" } }),
      selectRole: async () => ({ user: appUser, token: { access_token: "" } }),
      changePassword: async () => ({ user: appUser, token: { access_token: "" } }),
      applySession: () => {},
      loginWithToken: async () => ({ user: appUser, token: { access_token: "" } }),
      refreshUser: async () => {},
      logout: () => {},
    };
  }
  return c;
}

export function resolvePostAuthRoute(user: AppUser, token?: TokenResponse): "/change-password" | "/role-select" | "/dashboard" {
  if (user.mustChangePassword || token?.must_change_password) return "/change-password";
  if (token?.requires_role_selection || (user.roles.length > 1 && !token?.active_role_id && !user.activeRoleId)) {
    return "/role-select";
  }
  return "/dashboard";
}

export function canAssignSuperAdmin(user: AppUser | null): boolean {
  return user?.isTenantOwner ?? false;
}
