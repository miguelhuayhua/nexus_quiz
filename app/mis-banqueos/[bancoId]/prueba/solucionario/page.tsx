import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = {
  bancoId: string;
};

type SearchParams = {
  intentoId?: string;
};

type Props = {
  params: Params | Promise<Params>;
  searchParams?: SearchParams | Promise<SearchParams>;
};

export default async function MisBanqueoPruebaSolucionarioLegacyPage({ params, searchParams }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const resolvedSearch = await Promise.resolve(searchParams ?? {});
  const intentoId =
    typeof resolvedSearch.intentoId === "string" ? resolvedSearch.intentoId.trim() : "";
  const query = intentoId ? `?intentoId=${encodeURIComponent(intentoId)}` : "";

  redirect(`/mis-banqueos/${resolvedParams.bancoId}/solucionario${query}`);
}
