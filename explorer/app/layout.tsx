import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import Providers from "./providers";
import "./globals.css";

const RootLayout = async ({ children }: React.PropsWithChildren) => {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body style={{ minHeight: "100vh" }}>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  );
};

export default RootLayout;
