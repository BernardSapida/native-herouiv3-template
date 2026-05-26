import { getTabsForRole } from "@/navigation/tabs.config";
import { useAuthStore } from "@/store";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColor } from "heroui-native";
import { Pressable, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Hardcoded hex because expo-linear-gradient doesn't parse oklch.
// Derived from theme --accent: oklch(0.6204 0.195 253.83)
const GRADIENT_LIGHT: [string, string] = ["#7BADFF", "#3B6FEA"];
const GRADIENT_DARK: [string, string] = ["#5B8FF5", "#2A5DD8"];

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const role = useAuthStore((s) => s.session?.user.role ?? "user");
  const [background, surface, muted] = useThemeColor([
    "background",
    "surface",
    "muted",
  ]);

  const visibleNames = new Set(getTabsForRole(role).map((t) => t.name));
  const visibleRoutes = state.routes.filter((r) => visibleNames.has(r.name));
  const gradientColors =
    colorScheme === "dark" ? GRADIENT_DARK : GRADIENT_LIGHT;

  return (
    <View
      style={{
        backgroundColor: background,
        paddingHorizontal: 16,
        paddingBottom: insets.bottom + 8,
        paddingTop: 8,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          backgroundColor: surface,
          borderRadius: 16,
          height: 64,
          alignItems: "center",
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.1,
          shadowRadius: 16,
          elevation: 10,
        }}
      >
        {visibleRoutes.map((route) => {
          const { options } = descriptors[route.key];
          const routeIndex = state.routes.findIndex((r) => r.key === route.key);
          const isFocused = state.index === routeIndex;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          if (isFocused) {
            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                accessibilityLabel={options.title ?? route.name}
                accessibilityRole="tab"
                accessibilityState={{ selected: true }}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {options.tabBarIcon?.({
                    color: "#FFFFFF",
                    size: 22,
                    focused: true,
                  })}
                </LinearGradient>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityLabel={options.title ?? route.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: false }}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {options.tabBarIcon?.({
                color: muted,
                size: 22,
                focused: false,
              })}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
