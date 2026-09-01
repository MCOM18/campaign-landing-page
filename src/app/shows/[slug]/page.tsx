import { Suspense } from "react";
import type { Metadata } from "next";
import ShowCampaignClient from "./ShowCampaignClient";
import PageSkeleton from "@/components/PageSkeleton";
import { fetchConfig } from "@/lib/config/app.config";
import { resolveContentByPath } from "@/lib/content/resolveContentByPath";

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    try {
        const { slug } = await params;
        const config = await fetchConfig();
        const contentResult = resolveContentByPath(`shows/${slug}`, config);
        const show = contentResult?.type === "show"
            ? contentResult.data
            : (config.shows ?? []).find((s) => s.slug === slug);

        if (show) {
            const rawPoster = show.images?.poster || show.images?.posterMobile;
            const posterUrl = rawPoster
                ? (rawPoster.startsWith("http") ? rawPoster : `${show.imageBaseUrl || ""}${rawPoster}`)
                : undefined;

            const title = show.title ? `${show.title} - JOJO Gold` : "JOJO Gold";
            const description = show.title
                ? `Watch ${show.title} on JOJO Gold. Enjoy exclusive shows, ad-free streaming, and Full HD quality.`
                : "Get unlimited access to JOJO Gold. Enjoy exclusive content, no video ads, watch on up to 4 devices, and stream in Full HD 1080p.";

            return {
                title,
                description,
                openGraph: {
                    title,
                    description,
                    url: `https://jojoapp.in/shows/${slug}`,
                    siteName: "JOJO",
                    images: posterUrl
                        ? [
                            {
                                url: posterUrl,
                                alt: show.title || "Show Poster",
                            },
                        ]
                        : undefined,
                    locale: "en_IN",
                    type: "video.tv_show",
                },
                twitter: {
                    card: "summary_large_image",
                    title,
                    description,
                    images: posterUrl ? [posterUrl] : undefined,
                },
            };
        }
    } catch (error) {
        console.warn("[shows/[slug]] Failed to generate metadata", error);
    }

    return {
        title: "JOJO Gold",
    };
}

export default function ShowCampaignPage({ params }: PageProps) {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <ShowCampaignClient params={params} />
        </Suspense>
    );
}

