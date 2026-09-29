import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "ar";
export type Direction = "ltr" | "rtl";

interface I18nContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Topbar & Navigation
    "nav.workspace": "Workspace",
    "nav.core_erp": "Core ERP",
    "nav.inventory": "Inventory & Warehouse",
    "nav.operations": "Purchase",
    "nav.purchase": "Purchase",
    "nav.pos": "POS",
    "nav.sales_crm": "Sales & CRM",
    "nav.marketplace": "Marketplace",
    "nav.accounting": "Accounting & Finance",
    "nav.hrms": "HRMS",
    "nav.iot": "IoT",
    "nav.analytics": "Analytics & Intelligence",
    "nav.system": "System Configuration",
    "nav.dashboard": "Dashboard",

    // Greetings & Banner
    "greeting.morning": "Good morning",
    "greeting.afternoon": "Good afternoon",
    "greeting.evening": "Good evening",
    "banner.live_badge": "Live Workspace Updates",

    // KPI Metrics
    "kpi.total_revenue": "Total Revenue",
    "kpi.net_sales": "Net Sales",
    "kpi.active_orders": "Active Orders",
    "kpi.total_products": "Total Products",
    "kpi.active_customers": "Active Customers",
    "kpi.total_staff": "Total Staff",
    "kpi.low_stock": "Low Stock Items",
    "kpi.cash_balance": "Cash Balance",
    "kpi.growth": "vs last month",

    // Quick Actions
    "qa.title": "Quick Actions",
    "qa.generate_invoice": "Generate Invoice",
    "qa.create_po": "Create PO",
    "qa.add_product": "Add Product",
    "qa.register_employee": "Register Employee",
    "qa.approve_leave": "Approve Leave",
    "qa.view_inventory": "View Inventory",
    "qa.open_marketplace": "Open Marketplace",
    "qa.run_payroll": "Run Payroll",

    // Section Titles
    "sec.revenue_expenses": "Revenue vs Expenses Trend",
    "sec.branch_performance": "UAE Branch Performance",
    "sec.recent_activity": "Recent Audit Activity",
    "sec.notifications": "System Notifications",
    "sec.inventory_alerts": "Inventory & Stock Alerts",
    "sec.calendar": "Upcoming Schedule & Tasks",
    "sec.ai_insights": "AI Business Intelligence Insights",

    // Common
    "common.search_placeholder": "Search anything — orders, products, people…",
    "common.select_role": "Select Role",
    "common.switch_language": "Switch Language",
    "common.english": "English",
    "common.arabic": "العربية (Arabic)",
  },
  ar: {
    // Topbar & Navigation
    "nav.workspace": "مكان العمل",
    "nav.core_erp": "نظام ERP الرئيسي",
    "nav.inventory": "المخزون والمستودعات",
    "nav.operations": "العمليات التشغيلية",
    "nav.pos": "نقاط البيع (POS)",
    "nav.sales_crm": "المبيعات وإدارة العملاء",
    "nav.marketplace": "المتجر الإلكتروني",
    "nav.accounting": "المحاسبة والمالية",
    "nav.hrms": "الموارد البشرية",
    "nav.iot": "إنترنت الأشياء (IoT)",
    "nav.analytics": "التحليلات والذكاء الاصطناعي",
    "nav.system": "إعدادات النظام",
    "nav.dashboard": "لوحة التحكم",

    // Greetings & Banner
    "greeting.morning": "صباح الخير",
    "greeting.afternoon": "مساء الخير",
    "greeting.evening": "مساء الخير",
    "banner.live_badge": "تحديثات مباشرة لمكان العمل",

    // KPI Metrics
    "kpi.total_revenue": "إجمالي الإيرادات",
    "kpi.net_sales": "صافي المبيعات",
    "kpi.active_orders": "الطلبات النشطة",
    "kpi.total_products": "إجمالي المنتجات",
    "kpi.active_customers": "العملاء النشطون",
    "kpi.total_staff": "إجمالي الموظفين",
    "kpi.low_stock": "المنتجات منخفضة المخزون",
    "kpi.cash_balance": "الرصيد النقدي",
    "kpi.growth": "مقارنة بالشهر الماضي",

    // Quick Actions
    "qa.title": "إجراءات سريعة",
    "qa.generate_invoice": "إنشاء فاتورة",
    "qa.create_po": "أمر شراء جديد",
    "qa.add_product": "إضافة منتج",
    "qa.register_employee": "تسجيل موظف",
    "qa.approve_leave": "الموافقة على إجازة",
    "qa.view_inventory": "عرض المخزون",
    "qa.open_marketplace": "المتجر الإلكتروني",
    "qa.run_payroll": "مسير الرواتب",

    // Section Titles
    "sec.revenue_expenses": "مؤشر الإيرادات مقابل المصروفات",
    "sec.branch_performance": "أداء فروع دولة الإمارات",
    "sec.recent_activity": "سجل النشاط الحديث",
    "sec.notifications": "تنبيهات النظام",
    "sec.inventory_alerts": "تنبيهات المخزون والمنتجات",
    "sec.calendar": "الجدول الزمني والمهام القادمة",
    "sec.ai_insights": "تحليلات الذكاء الاصطناعي للأعمال",

    // Common
    "common.search_placeholder": "ابحث عن أي شيء — الطلبات، المنتجات، الأشخاص...",
    "common.select_role": "اختر الدور",
    "common.switch_language": "تغيير اللغة",
    "common.english": "English",
    "common.arabic": "العربية (Arabic)",
  },
};

const defaultValue: I18nContextType = {
  language: "en",
  direction: "ltr",
  setLanguage: () => { },
  t: (key: string, fallback?: string) => fallback || key,
};

const I18nContext = createContext<I18nContextType>(defaultValue);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window === "undefined") return "en";
    try {
      const saved = localStorage.getItem("bos-lang");
      return (saved === "ar" || saved === "en") ? saved : "en";
    } catch {
      return "en";
    }
  });

  const direction: Direction = language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      document.documentElement.dir = direction;
      document.documentElement.lang = language;
      localStorage.setItem("bos-lang", language);
      if (language === "ar") {
        document.documentElement.classList.add("rtl");
      } else {
        document.documentElement.classList.remove("rtl");
      }
    } catch (e) {
      console.error("Failed to update document direction:", e);
    }
  }, [language, direction]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string, fallback?: string): string => {
    return translations[language]?.[key] || fallback || translations.en[key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, direction, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
