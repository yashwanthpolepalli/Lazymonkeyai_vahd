import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "./auth-context";
import type { AuthRole } from "./auth-context";
import {
  resolveEffectiveModules,
  resolveEffectiveTabs,
  ALL_MODULE_IDS,
} from "@/data/modules-config";

interface RbacContextType {
  activeRole: AuthRole | null;
  setActiveRole: (role: AuthRole) => void;
  hasPermission: (permission: string) => boolean;
  isModuleAllowed: (moduleId: string) => boolean;
  isTabAllowed: (route: string) => boolean;
  allowedModules: string[];
  allowedTabs: string[] | null;
  availableRoles: AuthRole[];
}

const RbacContext = createContext<RbacContextType | undefined>(undefined);

export function RbacProvider({ children }: { children: React.ReactNode }) {
  const { user, selectRole } = useAuth();
  const [activeRole, setActiveRoleState] = useState<AuthRole | null>(null);
  const [modulesVersion, setModulesVersion] = useState(0);

  // All available roles come directly from the authenticated user's real roles
  const availableRoles: AuthRole[] = React.useMemo(() => {
    return user?.roles ?? [];
  }, [user]);

  useEffect(() => {
    if (user && availableRoles.length > 0) {
      const storedRoleId = localStorage.getItem("bos-active-role");
      let initialRole = availableRoles.find((r) => r.id === storedRoleId);

      if (!initialRole) {
        // Fall back to the default role, then the first one
        initialRole =
          availableRoles.find((r) => r.is_default) ??
          availableRoles.find((r) => r.id === user.defaultRole) ??
          availableRoles[0];
      }

      setActiveRoleState(initialRole ?? null);
    } else {
      setActiveRoleState(null);
    }
  }, [user, availableRoles]);

  // Listen for dynamic module configuration changes
  useEffect(() => {
    const handleModulesChanged = () => {
      setModulesVersion((v) => v + 1);
    };
    window.addEventListener("bos-modules-changed", handleModulesChanged);
    return () => window.removeEventListener("bos-modules-changed", handleModulesChanged);
  }, []);

  const setActiveRole = async (role: AuthRole) => {
    try {
      await selectRole(role.id);
    } catch (err) {
      console.error("Failed to switch role active session", err);
      setActiveRoleState(role);
      localStorage.setItem("bos-active-role", role.id);
    }
  };

  // Check whether current session has full Platform Super Admin privileges (God Mode)
  const isSuperAdmin = useMemo(() => {
    if (!user) return false;
    return Boolean(user.isPlatformAdmin);
  }, [user]);

  // Compute allowed modules for active session
  const allowedModules = useMemo(() => {
    if (!user || isSuperAdmin) return ALL_MODULE_IDS;
    return resolveEffectiveModules(user, activeRole);
  }, [user, activeRole, isSuperAdmin, modulesVersion]);

  // Compute allowed tabs for active session
  const allowedTabs = useMemo(() => {
    if (!user || isSuperAdmin) return null;
    return resolveEffectiveTabs(user, activeRole, allowedModules);
  }, [user, activeRole, isSuperAdmin, allowedModules, modulesVersion]);

  const isModuleAllowed = useCallback(
    (moduleId: string): boolean => {
      if (!moduleId || moduleId === "dashboard" || isSuperAdmin) return true;
      return allowedModules.includes(moduleId);
    },
    [allowedModules, isSuperAdmin]
  );

  const isTabAllowed = useCallback(
    (route: string): boolean => {
      if (!route || route === "/dashboard" || isSuperAdmin || !allowedTabs) return true;
      return allowedTabs.some((t) => route === t || route.startsWith(t.split("&")[0]));
    },
    [allowedTabs, isSuperAdmin]
  );

  const getModuleForPermission = (perm: string): string | null => {
    if (perm === "view:dashboard" || perm.startsWith("view:workspace")) return "dashboard";
    if (
      perm.startsWith("view:erp") ||
      perm.startsWith("manage:erp") ||
      perm.includes("company") ||
      perm.includes("branch") ||
      perm.includes("role") ||
      perm.includes("user") ||
      perm.includes("workflow")
    )
      return "erp";
    if (
      perm.includes("inventory") ||
      perm.includes("product") ||
      perm.includes("catalog") ||
      perm.includes("warehouse") ||
      perm.includes("stock") ||
      perm.includes("batch")
    )
      return "inventory";
    if (perm.includes("pos") || perm.includes("terminal") || perm.includes("cashier")) return "pos";
    if (
      perm.includes("procurement") ||
      perm.includes("purchase") ||
      perm.includes("supplier") ||
      perm.includes("vendor") ||
      perm.includes("grn") ||
      perm.includes("operations")
    )
      return "operations";
    if (
      perm.includes("accounting") ||
      perm.includes("finance") ||
      perm.includes("invoice") ||
      perm.includes("journal") ||
      perm.includes("bank") ||
      perm.includes("voucher") ||
      perm.includes("tax") ||
      perm.includes("chart_of_accounts") ||
      perm.includes("fixed_asset") ||
      perm.includes("expense_claim") ||
      perm.includes("budget")
    )
      return "accounting";
    if (
      perm.includes("crm") ||
      perm.includes("lead") ||
      perm.includes("deal") ||
      perm.includes("quotation") ||
      perm.includes("ticket") ||
      perm.includes("customer")
    )
      return "crm";
    if (
      perm.includes("hrms") ||
      perm.includes("employee") ||
      perm.includes("payroll") ||
      perm.includes("attendance") ||
      perm.includes("leave") ||
      perm.includes("ess") ||
      perm.includes("recruitment") ||
      perm.includes("payslip")
    )
      return "hrms";
    if (perm.includes("marketplace") || perm.includes("appstore")) return "marketplace";
    if (perm.includes("iot") || perm.includes("telemetry") || perm.includes("device") || perm.includes("sensor"))
      return "iot";
    if (
      perm.includes("analytics") ||
      perm.includes("reports") ||
      perm.includes("ai_insights") ||
      perm.includes("report_builder") ||
      perm === "view:analytics" ||
      perm === "manage:analytics" ||
      perm === "view:reports" ||
      perm === "manage:reports"
    ) {
      if (!perm.includes("hrms_")) return "analytics";
    }
    if (
      perm.includes("setting") ||
      perm.includes("system") ||
      perm.includes("config") ||
      perm.includes("audit") ||
      perm.includes("backup") ||
      perm.includes("webhooks")
    )
      return "settings";
    return null;
  };

  // hasPermission uses active role permissions or user permissions + allowed modules
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    // Determine the active permissions list
    const perms: string[] =
      activeRole?.permissions && activeRole.permissions.length > 0
        ? activeRole.permissions
        : (user.permissions ?? []);

    // 1. Super Admin / Platform Admin bypass: Unrestricted access to all modules and actions
    if (isSuperAdmin) {
      return true;
    }

    // 2. Check UI module-level restriction
    const targetMod = getModuleForPermission(permission);
    if (targetMod && targetMod !== "dashboard") {
      if (!allowedModules.includes(targetMod)) {
        return false;
      }
    }

    // 3. Special case: Dashboard is always visible if dashboard module is enabled
    if (permission === "view:dashboard" || permission.startsWith("view:workspace")) {
      return true;
    }

    // Wildcards within allowed modules
    if (
      perms.includes("all") ||
      perms.includes("*:*") ||
      perms.includes("super_admin") ||
      perms.includes("manage:all") ||
      perms.includes("*")
    ) {
      return true;
    }

    // Direct exact match
    if (perms.includes(permission)) return true;

    // Direct manage:* or edit:* or delete:* matches view:*
    if (permission.startsWith("view:")) {
      const resource = permission.replace("view:", "");
      if (
        perms.includes(`manage:${resource}`) ||
        perms.includes(`*:${resource}`) ||
        perms.includes(`edit:${resource}`) ||
        perms.includes(`delete:${resource}`) ||
        perms.includes(`create:${resource}`)
      ) {
        return true;
      }
    }

    // Module-group umbrella permissions (for topbar icons and module group visibility)
    if (permission === "view:hrms") {
      return allowedModules.includes("hrms") && perms.some(
        (p) =>
          p.startsWith("view:hrms") ||
          p.startsWith("manage:hrms") ||
          p.startsWith("view:ess") ||
          p.startsWith("manage:ess") ||
          p.includes("employee") ||
          p.includes("attendance") ||
          p.includes("leave") ||
          p.includes("payroll") ||
          p.includes("recruitment") ||
          p.includes("learning")
      );
    }
    if (permission === "view:erp") {
      return allowedModules.includes("erp") && perms.some((p) =>
        p.startsWith("view:erp") ||
        p.startsWith("manage:erp") ||
        p.startsWith("view:users") ||
        p.startsWith("manage:users") ||
        p.startsWith("view:roles") ||
        p.startsWith("manage:roles") ||
        p.startsWith("view:permission_matrix") ||
        p.startsWith("view:access_control") ||
        p.startsWith("manage:access_control") ||
        p.startsWith("view:workspaces") ||
        p.startsWith("manage:workspaces") ||
        p.startsWith("view:subscription") ||
        p.startsWith("manage:subscription") ||
        p.startsWith("view:api_keys") ||
        p.startsWith("manage:api_keys") ||
        p.startsWith("view:mfa_policies") ||
        p.startsWith("manage:mfa_policies") ||
        p.startsWith("view:company") ||
        p.startsWith("manage:company") ||
        p.startsWith("view:branches") ||
        p.startsWith("manage:branches") ||
        p.startsWith("view:departments") ||
        p.startsWith("manage:departments") ||
        p.startsWith("view:designations") ||
        p.startsWith("manage:designations") ||
        p.startsWith("view:teams") ||
        p.startsWith("manage:teams") ||
        p.startsWith("view:workflow") ||
        p.startsWith("manage:workflow") ||
        p.startsWith("view:financials") ||
        p.startsWith("manage:financials") ||
        p.startsWith("view:currencies") ||
        p.startsWith("manage:currencies") ||
        p.startsWith("view:fiscal_years") ||
        p.startsWith("manage:fiscal_years") ||
        p.startsWith("view:taxes") ||
        p.startsWith("manage:taxes") ||
        p.startsWith("view:payment_terms") ||
        p.startsWith("manage:payment_terms") ||
        p.startsWith("view:cost_centers") ||
        p.startsWith("manage:cost_centers") ||
        p.startsWith("view:number_series") ||
        p.startsWith("manage:number_series") ||
        p.startsWith("view:geography") ||
        p.startsWith("manage:geography") ||
        p.startsWith("view:locations") ||
        p.startsWith("manage:locations") ||
        p.startsWith("view:tags") ||
        p.startsWith("manage:tags") ||
        p.startsWith("view:document_templates") ||
        p.startsWith("manage:document_templates") ||
        p.startsWith("view:notification_templates") ||
        p.startsWith("manage:notification_templates")
      );
    }
    if (permission === "view:crm") {
      return allowedModules.includes("crm") && perms.some(
        (p) =>
          p.startsWith("view:crm") ||
          p.startsWith("manage:crm") ||
          p.includes("lead") ||
          p.includes("deal") ||
          p.includes("quotation") ||
          p.includes("customer")
      );
    }
    if (permission === "view:pos") {
      return allowedModules.includes("pos") && perms.some(
        (p) => p.startsWith("view:pos") || p.startsWith("manage:pos") || p.includes("terminal") || p.includes("cashier")
      );
    }
    if (permission === "view:inventory") {
      return allowedModules.includes("inventory") && perms.some(
        (p) =>
          p.startsWith("view:inventory") ||
          p.startsWith("manage:inventory") ||
          p.startsWith("view:products") ||
          p.startsWith("manage:products") ||
          p.includes("stock") ||
          p.includes("warehouse")
      );
    }
    if (permission === "view:procurement") {
      return allowedModules.includes("operations") && perms.some(
        (p) =>
          p.startsWith("view:procurement") ||
          p.startsWith("manage:procurement") ||
          p.startsWith("view:rfq") ||
          p.includes("purchase") ||
          p.includes("supplier") ||
          p.includes("vendor")
      );
    }
    if (
      permission === "view:settings" ||
      permission === "view:system_config" ||
      permission === "manage:system_config" ||
      permission === "manage:system_admin" ||
      permission === "manage:settings"
    ) {
      return allowedModules.includes("settings") && perms.some(
        (p) =>
          p.includes("system_config") ||
          p.includes("settings") ||
          p.includes("system_admin") ||
          p.includes("audit") ||
          p.includes("backup") ||
          p.includes("webhooks")
      );
    }
    if (permission === "view:marketplace") {
      return allowedModules.includes("marketplace") && perms.some((p) => p.startsWith("view:marketplace") || p.startsWith("manage:marketplace"));
    }
    if (permission === "view:accounting") {
      return allowedModules.includes("accounting") && perms.some(
        (p) =>
          p.startsWith("view:accounting") ||
          p.startsWith("manage:accounting") ||
          p.startsWith("view:chart_of_accounts") ||
          p.startsWith("view:journal") ||
          p.startsWith("view:bank") ||
          p.startsWith("view:fixed_assets") ||
          p.startsWith("view:expense_claims") ||
          p.startsWith("view:budgets") ||
          p.startsWith("view:tax") ||
          p.startsWith("view:invoices")
      );
    }
    if (permission === "view:iot") {
      return allowedModules.includes("iot") && perms.some(
        (p) => p.startsWith("view:iot") || p.startsWith("manage:iot") || p.includes("iot") || p.includes("telemetry") || p.includes("device")
      );
    }
    if (
      permission === "view:reports" ||
      permission === "view:analytics" ||
      permission === "manage:analytics" ||
      permission === "manage:reports" ||
      permission === "view:ai_insights" ||
      permission === "manage:ai_insights"
    ) {
      return allowedModules.includes("analytics") && perms.some(
        (p) => (p.includes("analytics") || p.includes("report") || p.includes("ai_insights")) && !p.includes("hrms_")
      );
    }
    return false;
  };

  return (
    <RbacContext.Provider value={{ activeRole, setActiveRole, hasPermission, isModuleAllowed, isTabAllowed, allowedModules, allowedTabs, availableRoles }}>
      {children}
    </RbacContext.Provider>
  );
}

export function useRbac() {
  const context = useContext(RbacContext);
  if (context === undefined) {
    return {
      activeRole: { id: "role_admin", name: "owner", permissions: ["*"] } as any,
      setActiveRole: () => {},
      hasPermission: () => true,
      isModuleAllowed: () => true,
      isTabAllowed: () => true,
      allowedModules: ALL_MODULE_IDS,
      allowedTabs: null,
      availableRoles: [{ id: "role_admin", name: "owner", permissions: ["*"] } as any],
    };
  }
  return context;
}
