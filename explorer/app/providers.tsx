"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { theme, App } from "antd";
import type { Session } from "next-auth";
import { XProvider } from "@ant-design/x";

interface ProvidersProps {
  children: React.ReactNode;
  session: Session | null;
}

const Providers: React.FC<ProvidersProps> = ({ children, session }) => {
  return (
    <SessionProvider session={session}>
      <XProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: "#1890ff",
          },
        }}
        componentSize="small"
      >
        <App>{children}</App>
      </XProvider>
    </SessionProvider>
  );
};

export default Providers;
