import { redirect } from "next/navigation";

export async function generateStaticParams() {
  return [{ id: "default" }];
}

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
