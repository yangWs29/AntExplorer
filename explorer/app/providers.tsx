"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { theme, App, Layout } from "antd";
import type { Session } from "next-auth";
import { XProvider } from "@ant-design/x";
import { Content } from "antd/es/layout/layout";

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
        <App>
          <Layout style={{ minHeight: "100vh" }}>
            <Content>{children}</Content>
          </Layout>
        </App>
      </XProvider>
    </SessionProvider>
  );
};

export default Providers;
