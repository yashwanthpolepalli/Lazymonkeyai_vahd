import { useTenant } from "@/contexts/tenant-context";
import * as baseData from "@/data/mockHrmsData";

export function useHrmsData() {
  const { tenant } = useTenant();

  if (tenant?.id === "c2") {
    // Atlas Manufacturing (c2)
    return {
      ...baseData,
      mockHrStats: {
        ...baseData.mockHrStats,
        totalEmployees: 412,
        activeEmployees: 390,
        newJoinees: 12,
        openPositions: 18,
        avgAttendance: 96,
        attritionRate: 4.2,
      },
      mockEmployees: baseData.mockEmployees.map((e, i) => ({
        ...e,
        department: e.department === "Sales" ? "Production" : e.department === "Engineering" ? "Quality Control" : e.department,
        name: i % 2 === 0 ? e.name + " (Atlas)" : e.name,
      })),
      mockDepartments: baseData.mockDepartments.map((d, i) => ({
        ...d,
        name: d.name === "Sales" ? "Production" : d.name === "Engineering" ? "Quality Control" : d.name,
        employees: Math.floor(d.employees * 1.5),
      })),
      mockAttendance: baseData.mockAttendance.map((a) => ({
        ...a,
        status: a.status === "Present" ? "Present" : "Late", // just slight variation
      })),
    };
  }

  if (tenant?.id === "c3") {
    // Helios Logistics (c3)
    return {
      ...baseData,
      mockHrStats: {
        ...baseData.mockHrStats,
        totalEmployees: 205,
        activeEmployees: 190,
        newJoinees: 8,
        openPositions: 42,
        avgAttendance: 92,
        attritionRate: 8.5,
      },
      mockEmployees: baseData.mockEmployees.map((e, i) => ({
        ...e,
        department: e.department === "Sales" ? "Dispatch" : e.department === "Engineering" ? "Fleet Maintenance" : e.department,
      })),
      mockDepartments: baseData.mockDepartments.map((d, i) => ({
        ...d,
        name: d.name === "Sales" ? "Dispatch" : d.name === "Engineering" ? "Fleet Maintenance" : d.name,
        employees: Math.floor(d.employees * 0.8),
      })),
    };
  }

  // Default: Nimbus Retail Group (c1)
  return baseData;
}
