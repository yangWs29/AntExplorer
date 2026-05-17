import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ImagePreviewProvider } from "./hooks/global-image-preview-context";
import { VideoPreviewProvider } from "./hooks/video-preview-context";
import Providers from "./providers";
import "./globals.css";

const RootLayout = async ({ children }: React.PropsWithChildren) => {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body style={{ minHeight: "100vh" }}>
        <Providers session={session}>
          <AntdRegistry>
            <ImagePreviewProvider>
              <VideoPreviewProvider>{children}</VideoPreviewProvider>
            </ImagePreviewProvider>
          </AntdRegistry>
        </Providers>
      </body>
    </html>
  );
};

export default RootLayout;
