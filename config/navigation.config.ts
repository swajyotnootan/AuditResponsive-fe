// config/navigation.config.ts
import { UserRole } from "@/types/user";

export interface NavigationItem {
  route: string;
  title: string;
  icon: string;
  badge?: boolean;
  action?: string;
  tab?: string; // For tab-based routing (Lead Auditor, Initiator, etc.)
}

// Role-based navigation configuration
export const getNavigationByRole = (role: string): NavigationItem[] => {
  const normalizedRole = role?.toUpperCase() as UserRole;

  const commonItems: NavigationItem[] = [
    { route: "/(app)/(tabs)", title: "Dashboard", icon: "Home" },
  ];

  switch (normalizedRole) {
    case UserRole.MASTER:
      return [
        { route: "/(app)/(tabs)", title: "Dashboard", icon: "Home" },
        {
          route: "/(app)/(tabs)/master?section=user-management",
          title: "User Management",
          icon: "Users",
          action: "user-management",
        },
        {
          route: "/(app)/(tabs)/master?section=enterprise-management",
          title: "Enterprise",
          icon: "Building",
          action: "enterprise-management",
        },
        {
          route: "/(app)/(tabs)/master?section=role-management",
          title: "Role Management",
          icon: "Shield",
          action: "role-management",
        },
        {
          route: "/(app)/(tabs)/master?section=audit-type-management",
          title: "Audit Types",
          icon: "Award",
          action: "audit-type-management",
        },
        {
          route: "/(app)/(tabs)/master?section=competency-management",
          title: "Competency",
          icon: "GraduationCap",
          action: "competency-management",
        },
        {
          route: "/(app)/(tabs)/master?section=logo-mgmt",
          title: "Logo Management",
          icon: "CheckSquare",
          action: "logo-mgmt",
        },
        {
          route: "/(app)/(tabs)/master?section=line-mgmt",
          title: "Line Management",
          icon: "ClipboardList",
          action: "line-mgmt",
        },
        // ✅ Removed Calendar for Master
      ];

    case UserRole.AUDITOR:
      return [
        { route: "/(app)/(tabs)", title: "Dashboard", icon: "Home" },
        {
          route: "/(app)/(tabs)/auditor?tab=my-audits",
          title: "My Audits",
          icon: "ClipboardCheck",
          tab: "my-audits",
          badge: true,
        },
        {
          route: "/(app)/(tabs)/calendar",
          title: "Calendar",
          icon: "Calendar",
        },
        {
          route: "/(app)/(tabs)/auditor?tab=ncr-pending",
          title: "NCR Pending",
          icon: "AlertTriangle",
          tab: "ncr-pending",
          badge: true,
        },
        {
          route: "/(app)/(tabs)/auditor?tab=ncr-list",
          title: "My NCRs",
          icon: "TrendingUp",
          tab: "ncr-list",
          badge: true,
        },
      ];

    case UserRole.HOD:
      return [
        { route: "/(app)/(tabs)", title: "Dashboard", icon: "Home" },
        {
          route: "/(app)/(tabs)/fresh-8d",
          title: "Fresh 8D",
          icon: "FilePlus",
        },
        {
          route: "/(app)/(tabs)/ncr-8d",
          title: "NCR 8D",
          icon: "AlertCircle",
        },
      ];

    case UserRole.LEAD_AUDITOR:
      return [
        { route: "/(app)/(tabs)", title: "Dashboard", icon: "Home" },
        {
          route: "/(app)/(tabs)/lead-auditor?tab=overview",
          title: "Dashboard Overview",
          icon: "BarChart2",
          tab: "overview",
        },
        {
          route: "/(app)/(tabs)/lead-auditor?tab=audits",
          title: "Audits",
          icon: "Calendar",
          tab: "audits",
        },
        {
          route: "/(app)/(tabs)/lead-auditor?tab=responses",
          title: "CheckSheets",
          icon: "FileText",
          tab: "responses",
        },
        {
          route: "/(app)/(tabs)/lead-auditor?tab=ncrs",
          title: "NCR Management",
          icon: "AlertTriangle",
          tab: "ncrs",
        },
        {
          route: "/(app)/(tabs)/lead-auditor?tab=auditors",
          title: "Auditors",
          icon: "Users",
          tab: "auditors",
        },
        {
          route: "/(app)/(tabs)/lead-auditor?tab=auditees",
          title: "Auditees",
          icon: "UserCheck",
          tab: "auditees",
        },
        {
          route: "/(app)/(tabs)/calendar",
          title: "Calendar",
          icon: "Calendar",
        },
      ];

    case UserRole.AUDITEE:
      return [
        { route: "/(app)/(tabs)", title: "Dashboard", icon: "Home" },
        {
          route: "/(app)/(tabs)/auditee?tab=my-audits",
          title: "My Audits",
          icon: "UserCheck",
          tab: "my-audits",
        },
        {
          route: "/(app)/(tabs)/auditee?tab=ncr-pending",
          title: "NCR Pending",
          icon: "AlertCircle",
          tab: "ncr-pending",
          badge: true,
        },
        {
          route: "/(app)/(tabs)/auditee?tab=my-ncrs",
          title: "My NCRs",
          icon: "TrendingUp",
          tab: "my-ncrs",
          badge: true,
        },
        {
          route: "/(app)/(tabs)/calendar",
          title: "Calendar",
          icon: "Calendar",
        },
      ];

    case UserRole.AUDIT_MANAGER:
      return [
        {
          route: "/(app)/(tabs)/audit-manager?tab=dashboard",
          title: "Dashboard",
          icon: "Home",
          tab: "dashboard",
        },
        {
          route: "/(app)/(tabs)/audit-manager?tab=schedules",
          title: "Schedules Workflow",
          icon: "Folder",
          tab: "schedules",
        },
        {
          route: "/(app)/(tabs)/audit-manager?tab=ncr",
          title: "NCR Management",
          icon: "ClipboardList",
          tab: "ncr",
        },
        {
          route: "/(app)/(tabs)/audit-manager?tab=requests",
          title: "Pending Requests",
          icon: "MessageSquare",
          tab: "requests",
        },
        {
          route: "/(app)/(tabs)/calendar",
          title: "Calendar",
          icon: "Calendar",
        },
      ];

    case UserRole.INITIATOR:
      return [
        { route: "/(app)/(tabs)", title: "Dashboard", icon: "Home" },
        {
          route: "/(app)/(tabs)/fresh-8d",
          title: "Fresh 8D",
          icon: "FilePlus",
        },
        {
          route: "/(app)/(tabs)/ncr-8d",
          title: "NCR 8D",
          icon: "AlertCircle",
        },
      ];

    case UserRole.TOP_MANAGEMENT:
      return [
        {
          route: "/(app)/(tabs)/top-management?tab=overview",
          title: "Dashboard Overview",
          icon: "BarChart2",
          tab: "overview",
        },
        {
          route: "/(app)/(tabs)/top-management?tab=annual",
          title: "Annual Plan",
          icon: "Globe",
          tab: "annual",
        },
        {
          route: "/(app)/(tabs)/top-management?tab=dept",
          title: "Dept Plan",
          icon: "List",
          tab: "dept",
        },
        {
          route: "/(app)/(tabs)/top-management?tab=week",
          title: "Week Schedule",
          icon: "Calendar",
          tab: "week",
        },
        {
          route: "/(app)/(tabs)/top-management?tab=daily",
          title: "Daily Schedule",
          icon: "CheckCircle",
          tab: "daily",
        },
        {
          route: "/(app)/(tabs)/calendar",
          title: "Calendar",
          icon: "Calendar",
        },
      ];

    case UserRole.HR_ADMIN:
      return [
        { route: "/(app)/(tabs)", title: "Dashboard", icon: "Home" },
        {
          route: "/(app)/(tabs)/hr-admin",
          title: "HR Panel",
          icon: "Settings",
        },
        {
          route: "/(app)/(tabs)/calendar",
          title: "Calendar",
          icon: "Calendar",
        },
        { route: "/admin/users", title: "Users", icon: "Users" },
        {
          route: "/admin/competency",
          title: "Competency",
          icon: "GraduationCap",
        },
      ];

    case UserRole.QMS_ADMIN:
      return [
        { route: "/(app)/(tabs)", title: "Dashboard", icon: "Home" },
        {
          route: "/(app)/(tabs)/qms-admin",
          title: "QMS Panel",
          icon: "Shield",
        },
        { route: "/compliance", title: "Compliance", icon: "CheckSquare" },
      ];

    default:
      return commonItems;
  }
};

// Check if user can access a specific route
export const canAccessRoute = (role: string, route: string): boolean => {
  const allowedRoutes = getNavigationByRole(role);
  return allowedRoutes.some((item) => item.route === route);
};

// Get active tab from route
export const getActiveTabFromRoute = (
  role: string,
  route: string,
): string | null => {
  const items = getNavigationByRole(role);
  const matchedItem = items.find(
    (item) =>
      item.route === route ||
      (item.route.includes("?") && route.includes(item.route.split("?")[0])),
  );
  return matchedItem?.tab || matchedItem?.action || null;
};

// Get navigation items for a specific role with tab parameter
export const getNavigationWithTab = (
  role: string,
  tab?: string,
): NavigationItem[] => {
  const items = getNavigationByRole(role);
  if (tab) {
    return items.map((item) => ({
      ...item,
      route: item.route.includes("?") ? item.route : `${item.route}?tab=${tab}`,
    }));
  }
  return items;
};