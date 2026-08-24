import type { Metadata } from "next";
import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Inicio",
  description: "Redirección principal de acceso a Nexus Preguntas.",
};

export default async function Home() {
  const session = await getServerAuthSession();
  const mainProjectUrl =
    process.env.MAIN_PROJECT_URL ?? "https://nexus-educa.tech";
  const normalizedMainProjectUrl = mainProjectUrl.endsWith("/")
    ? mainProjectUrl.slice(0, -1)
    : mainProjectUrl;

  if (!session?.user) {
    redirect(`${normalizedMainProjectUrl}/login`);
  }
  else {
    redirect(`/banqueos`);
  }

}
