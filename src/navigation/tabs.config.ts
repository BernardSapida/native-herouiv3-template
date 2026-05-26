import { Activity, Bell, Compass, Flag, Home, Shield } from "lucide-react-native";
import type { ComponentType } from "react";

export type TabConfig = {
  name: string;
  label: string;
  Icon: ComponentType<{ color: string; size: number }>;
};

const BASE_TABS: TabConfig[] = [
  { name: "index", label: "Home", Icon: Home },
];

const ROLE_EXTRAS: Record<string, TabConfig[]> = {
  admin: [{ name: "admin", label: "Admin", Icon: Shield }],
  moderator: [{ name: "reports", label: "Reports", Icon: Flag }],
  user: [
    { name: "explore", label: "Explore", Icon: Compass },
    { name: "notifications", label: "Notifications", Icon: Bell },
    { name: "activity", label: "Activity", Icon: Activity },
  ],
};

export function getTabsForRole(role?: string): TabConfig[] {
  const extras = ROLE_EXTRAS[role ?? "user"] ?? ROLE_EXTRAS.user;
  return [...BASE_TABS, ...extras];
}
