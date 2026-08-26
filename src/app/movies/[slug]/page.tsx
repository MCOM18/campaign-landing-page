import { Suspense } from "react";
import MovieCampaignClient from "./MovieCampaignClient";
import PageSkeleton from "@/components/PageSkeleton";

export function generateStaticParams() {
    return [{ slug: "default" }];
}

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default function MovieCampaignPage({ params }: PageProps) {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <MovieCampaignClient params={params} />
        </Suspense>
    );
}
