import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";
import { getTabsForRole } from "@/navigation/tabs.config";
import { useAuthStore } from "@/store";

export default function AppLayout() {
  const [background, border, accent, muted] = useThemeColor([
    "background",
    "border",
    "accent",
    "muted",
  ]);

  const role = useAuthStore((s) => s.session?.user.role ?? "user");
  const tabs = getTabsForRole(role);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: background,
          borderTopColor: border,
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: muted,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.label,
            tabBarIcon: ({ color, size }) => (
              <tab.Icon color={color} size={size} />
            ),
          }}
        />
      ))}

      {/* Role-specific screens hidden for non-matching roles */}
      {role !== "admin" && (
        <Tabs.Screen name="admin" options={{ href: null }} />
      )}
      {role !== "moderator" && (
        <Tabs.Screen name="reports" options={{ href: null }} />
      )}
      {role !== "user" && (
        <>
          <Tabs.Screen name="explore" options={{ href: null }} />
          <Tabs.Screen name="notifications" options={{ href: null }} />
          <Tabs.Screen name="activity" options={{ href: null }} />
        </>
      )}

      {/* Accessible but not in tab bar */}
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="about" options={{ href: null }} />
    </Tabs>
  );
}
