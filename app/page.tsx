import { getServerAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerAuthSession();
  const mainProjectUrl =
    process.env.MAIN_PROJECT_URL ?? "https://nexus.posgrado.cicap.test";
  const normalizedMainProjectUrl = mainProjectUrl.endsWith("/")
    ? mainProjectUrl.slice(0, -1)
    : mainProjectUrl;

  if (!session?.user) {
    redirect(`${normalizedMainProjectUrl}/login`);
  }
  else {
    redirect(`/market`);
  }

}
