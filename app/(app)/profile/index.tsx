import { useRouter } from "expo-router";
import { ChevronRight, KeyRound, Pencil, Trash2 } from "lucide-react-native";
import { Button, Card } from "heroui-native";
import { useThemeColor } from "heroui-native";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { signOut as signOutApi } from "@/features/auth/api";
import logger from "@/lib/logger";
import { useAuthStore } from "@/store";

function initials(firstname: string, lastname: string) {
  return `${firstname.charAt(0)}${lastname.charAt(0)}`.toUpperCase();
}

type MenuRowProps = {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  destructive?: boolean;
};

function MenuRow({ label, icon, onPress, destructive }: MenuRowProps) {
  const [border] = useThemeColor(["border"]);
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 py-4 px-1"
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <View className="w-8 items-center">{icon}</View>
      <Text
        className={`flex-1 text-base ${
          destructive ? "text-danger" : "text-foreground"
        }`}
      >
        {label}
      </Text>
      <ChevronRight size={18} className="text-default-400" />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { session, clearAuth, token } = useAuthStore();
  const [accent] = useThemeColor(["accent"]);

  const user = session?.user;

  const handleSignOut = async () => {
    try {
      await signOutApi(token);
    } catch (error) {
      logger.error("signOut error", error);
    }
    clearAuth();
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 24, gap: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar + name */}
        <Card>
          <Card.Body className="items-center gap-3 py-6">
            <View className="w-20 h-20 rounded-full bg-accent items-center justify-center">
              <Text className="text-accent-foreground text-2xl font-bold">
                {user
                  ? initials(user.firstname, user.lastname)
                  : "?"}
              </Text>
            </View>
            <View className="items-center gap-1">
              <Text className="text-lg font-semibold text-foreground">
                {user ? `${user.firstname} ${user.lastname}` : ""}
              </Text>
              <Text className="text-sm text-default-500">{user?.email}</Text>
            </View>
          </Card.Body>
        </Card>

        {/* Account actions */}
        <Card>
          <Card.Body className="px-4 py-0">
            <MenuRow
              label="Edit Profile"
              icon={<Pencil size={18} color={accent} />}
              onPress={() => router.push("/(app)/profile/edit")}
            />
            <View className="h-px bg-border" />
            <MenuRow
              label="Change Password"
              icon={<KeyRound size={18} color={accent} />}
              onPress={() => router.push("/(app)/profile/change-password")}
            />
            <View className="h-px bg-border" />
            <MenuRow
              label="Delete Account"
              icon={<Trash2 size={18} className="text-danger" />}
              onPress={() => router.push("/(app)/profile/delete-account")}
              destructive
            />
          </Card.Body>
        </Card>

        {/* Sign out */}
        <Button
          variant="danger-soft"
          size="lg"
          className="w-full"
          onPress={handleSignOut}
        >
          <Button.Label>Sign out</Button.Label>
        </Button>
      </ScrollView>
    </Screen>
  );
}
