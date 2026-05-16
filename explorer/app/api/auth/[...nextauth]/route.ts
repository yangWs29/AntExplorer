import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // 简单的用户名密码验证
        if (
          credentials.username === "admin" &&
          credentials.password === "admin"
        ) {
          return {
            id: "1",
            name: "admin",
            role: "admin",
            accessToken: "mock-access-token",
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // 初次登录时，将用户信息添加到 token
      if (user) {
        token.id = user.id;
        token.role = user.role || "";
        token.accessToken = user.accessToken || "";
      }
      return token;
    },
    async session({ session, token }) {
      // 将 token 中的信息添加到 session
      if (session.user) {
        session.user.id = token.id || "";
        session.user.role = token.role || "";
        session.user.accessToken = token.accessToken || "";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
