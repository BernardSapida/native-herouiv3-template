import * as SecureStore from "expo-secure-store";
import { Button, Card } from "heroui-native";
import { ScrollView, Text, View } from "react-native";

import { Screen } from "@/components/ui/Screen";
import { useAuthStore } from "@/store/auth.store";

const TOKEN_KEY = "auth_token";

export default function HomeScreen() {
  const { session, clearAuth, token } = useAuthStore();

  const signOut = async () => {
    await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        Origin: process.env.EXPO_PUBLIC_API_URL!,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }).catch(() => {});
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    clearAuth(); // AuthGate detects session → null and redirects to sign-in
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingTop: 32, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View>
          <Text className="text-2xl font-bold text-foreground">
            {session?.user.firstname
              ? `Hello, ${session.user.firstname} 👋`
              : "Hello 👋"}
          </Text>
          <Text className="text-default-500 mt-2">
            Your foundation is ready. Start building.
          </Text>
        </View>

        {/* Placeholder content card */}
        <Card>
          <Card.Header>
            <Card.Title>Getting started</Card.Title>
          </Card.Header>
          <Card.Body>
            <Card.Description>
              Auth, tRPC, and TanStack Query are all wired up. Add your feature
              screens here.
            </Card.Description>
          </Card.Body>
        </Card>

        {/* Account card */}
        <Card variant="secondary">
          <Card.Header>
            <Card.Title>Account</Card.Title>
          </Card.Header>
          <Card.Body>
            <Card.Description>{session?.user.email}</Card.Description>
          </Card.Body>
          <Card.Footer className="mt-4">
            <Button
              variant="danger-soft"
              size="md"
              className="flex-1"
              onPress={signOut}
            >
              <Button.Label>Sign out</Button.Label>
            </Button>
          </Card.Footer>
        </Card>
      </ScrollView>
    </Screen>
  );
}
