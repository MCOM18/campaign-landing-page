import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DynamicCampaignRedirect({ params }: PageProps) {
  const { id } = await params;
  
  if (id) {
    redirect(`/offer/${id}`);
  } else {
    redirect("/");
  }
}
