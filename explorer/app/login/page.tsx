import React from "react";
import AdminLoginForm from "@/components/admin-login-form";
import { Layout } from "antd";
import { Content } from "antd/es/layout/layout";

const LoginPage: React.FC = () => {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Content
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <AdminLoginForm />
      </Content>
    </Layout>
  );
};

export default LoginPage;
