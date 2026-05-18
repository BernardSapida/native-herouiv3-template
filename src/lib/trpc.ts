import { createTRPCClient, httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import { useAuthStore } from "@/store/auth.store";

// TODO: replace with your AppRouter type once the server project is linked
// e.g. import type { AppRouter } from "../../zo-personal-finance/src/integrations/trpc/router";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppRouter = any;

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${process.env.EXPO_PUBLIC_API_URL}/trpc`,
      transformer: superjson,
      headers() {
        const token = useAuthStore.getState().token;
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
