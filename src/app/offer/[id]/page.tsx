import OfferDetailsClient from "./OfferDetailsClient";

export function generateStaticParams() {
  return [{ id: "default" }];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OfferDetailsPage({ params }: PageProps) {
  return <OfferDetailsClient params={params} />;
}