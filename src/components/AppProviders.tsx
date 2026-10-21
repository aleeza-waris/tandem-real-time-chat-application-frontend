"use client";

import { useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { ConfigProvider } from "antd";
import { makeStore, type AppStore } from "@/store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [store] = useState<AppStore>(() => makeStore());
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const app = (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#4F46E5",
          colorError: "#D9485F",
          colorText: "#25243A",
          colorBgBase: "#F7F7FC",
          colorBorder: "#E0DEF2"
        }
      }}
    >
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </Provider>
    </ConfigProvider>
  );
  return clientId ? <GoogleOAuthProvider clientId={clientId}>{app}</GoogleOAuthProvider> : app;
}
