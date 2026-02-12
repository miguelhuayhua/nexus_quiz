import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ evaluacionId: string }>;
};

export default async function MarketDetailPage({ params }: Props) {
  const { evaluacionId } = await params;
  redirect(`/banqueos/${evaluacionId}`);
}
