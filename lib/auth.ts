import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const isProduction = process.env.NODE_ENV === "production";
const cookieDomain = isProduction ? ".cicap.tech" : ".cicap.tech";

export const authOptions: NextAuthOptions = {
  providers: [
    // This app only consumes an existing shared session.
    CredentialsProvider({
      id: "shared-session",
      name: "Shared Session",
      credentials: {},
      async authorize() {
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: "__Secure-next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
        domain: cookieDomain,
      },
    },
  },
  useSecureCookies: true,
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.registrado = token.registrado as boolean | undefined;
      }
      return session;
    },
  },
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}
