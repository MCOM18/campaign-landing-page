import { Suspense } from "react";
import ShowCampaignClient from "./ShowCampaignClient";
import PageSkeleton from "@/components/PageSkeleton";

export function generateStaticParams() {
    return [{ slug: "default" }];
}

interface PageProps {
    params: Promise<{ slug: string }>;
}

export default function ShowCampaignPage({ params }: PageProps) {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <ShowCampaignClient params={params} />
        </Suspense>
    );
}
