import { Suspense } from "react";
import OfferDetailsClient from "./OfferDetailsClient";
import PageSkeleton from "@/components/PageSkeleton";

export function generateStaticParams() {
  return [{ id: "default" }];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OfferDetailsPage({ params }: PageProps) {
  return (
    <Suspense fallback={<PageSkeleton />}>

      <OfferDetailsClient params={params} />
    </Suspense>
  );
}