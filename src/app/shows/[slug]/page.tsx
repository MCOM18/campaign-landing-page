import { Suspense } from "react";
import ShowCampaignClient from "./ShowCampaignClient";
import PageSkeleton from "@/components/PageSkeleton";
import { fetchConfig } from "@/lib/config/app.config";

// Pulls the real show slugs from the CMS at build time so each campaign gets
// its own prebuilt HTML file in the static export (no slug -> hard 404 -> "/" bounce
// on hosts that don't rewrite unmatched /shows/* requests to the "default" page).
export async function generateStaticParams() {
    try {
        const config = await fetchConfig();
        const slugs = (config.shows ?? []).map((show) => show.slug).filter(Boolean);
        return [...new Set(["default", ...slugs])].map((slug) => ({ slug }));
    } catch (error) {
        console.warn("[shows/[slug]] Failed to fetch campaign config at build time, only 'default' will be prebuilt", error);
        return [{ slug: "default" }];
    }
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
