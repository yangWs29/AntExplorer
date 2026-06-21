import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// 需要保护的路径前缀
const PROTECTED_PATHS = ["/explorer"];

// 公开的路径（不需要认证）
const PUBLIC_PATHS = ["/login", "/api/auth"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否是公开路径
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // 检查是否是受保护的路径
  const isProtectedPath = PROTECTED_PATHS.some((path) =>
    pathname.startsWith(path),
  );

  if (!isProtectedPath) {
    return NextResponse.next();
  }

  // 获取 token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  // 如果未登录，重定向到登录页
  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", encodeURI(pathname));
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
