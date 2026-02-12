import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { AppLayoutShell } from "@/components/app-layout-shell";
import { getServerAuthSession } from "@/lib/auth";
import {
  hasActiveProSubscription,
  resolveUsuarioEstudianteIdFromSession,
} from "@/lib/subscription-access";
import { AppProviders } from "@/providers/app-providers";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Nexus Preguntas",
    template: "%s | Nexus Preguntas",
  },
  description:
    "Plataforma de banqueos, repaso, historial y evaluaciones para estudiantes.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerAuthSession();
  let userPlan: "FREE" | "PRO" = "FREE";

  if (session?.user) {
    const usuarioEstudianteId = await resolveUsuarioEstudianteIdFromSession({
      userId: session.user.id,
      email: session.user.email ?? null,
    });
    const hasPro = await hasActiveProSubscription(usuarioEstudianteId);
    userPlan = hasPro ? "PRO" : "FREE";
  }

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${poppins.variable} font-sans antialiased`}>
        <AppProviders>
          <AppLayoutShell
            user={
              session?.user
                ? {
                    email: session.user.email,
                    image: session.user.image,
                    name: session.user.name,
                    registrado: session.user.registrado,
                    plan: userPlan,
                  }
                : null
            }
          >
            {children}
          </AppLayoutShell>
        </AppProviders>
      </body>
    </html>
  );
}
