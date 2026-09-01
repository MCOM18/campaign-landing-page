import { Suspense } from "react";
import type { Metadata } from "next";
import MovieCampaignClient from "./MovieCampaignClient";
import PageSkeleton from "@/components/PageSkeleton";
import { fetchConfig } from "@/lib/config/app.config";
import { resolveContentByPath } from "@/lib/content/resolveContentByPath";

// Pulls the real movie slugs from the CMS at build time so each campaign gets
// its own prebuilt HTML file in the static export (no slug -> hard 404 -> "/" bounce
// on hosts that don't rewrite unmatched /movies/* requests to the "default" page).
export async function generateStaticParams() {
    try {
        const config = await fetchConfig();
        const slugs = (config.movies ?? []).map((movie) => movie.slug).filter(Boolean);
        return [...new Set(["default", ...slugs])].map((slug) => ({ slug }));
    } catch (error) {
        console.warn("[movies/[slug]] Failed to fetch campaign config at build time, only 'default' will be prebuilt", error);
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
        const contentResult = resolveContentByPath(`movies/${slug}`, config);
        const movie = contentResult?.type === "movie"
            ? contentResult.data
            : (config.movies ?? []).find((m) => m.slug === slug);

        if (movie) {
            const rawPoster = movie.images?.poster || movie.images?.posterMobile;
            const posterUrl = rawPoster
                ? (rawPoster.startsWith("http") ? rawPoster : `${movie.imageBaseUrl || ""}${rawPoster}`)
                : undefined;

            const title = movie.title ? `${movie.title} - JOJO Gold` : "JOJO Gold";
            const description = movie.title
                ? `Watch ${movie.title} on JOJO Gold. Enjoy exclusive movies, ad-free streaming, and Full HD quality.`
                : "Get unlimited access to JOJO Gold. Enjoy exclusive content, no video ads, watch on up to 4 devices, and stream in Full HD 1080p.";

            return {
                title,
                description,
                openGraph: {
                    title,
                    description,
                    url: `https://jojoapp.in/movies/${slug}`,
                    siteName: "JOJO",
                    images: posterUrl
                        ? [
                            {
                                url: posterUrl,
                                alt: movie.title || "Movie Poster",
                            },
                        ]
                        : undefined,
                    locale: "en_IN",
                    type: "video.movie",
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
        console.warn("[movies/[slug]] Failed to generate metadata", error);
    }

    return {
        title: "JOJO Gold",
    };
}

export default function MovieCampaignPage({ params }: PageProps) {
    return (
        <Suspense fallback={<PageSkeleton />}>
            <MovieCampaignClient params={params} />
        </Suspense>
    );
}

