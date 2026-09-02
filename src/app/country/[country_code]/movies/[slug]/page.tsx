import { Suspense } from "react";
import type { Metadata } from "next";
import PageSkeleton from "@/components/PageSkeleton";
import { fetchConfig } from "@/lib/config/app.config";
import { resolveContentByPath } from "@/lib/content/resolveContentByPath";
import MovieCampaignClient from "./InMovieCampaignClient";

// Unlike movies/[slug], country codes aren't a bounded list known at build time, so this
// route only prebuilds a single "default" fallback (country/default/movies/default.html).
// Hosting must rewrite unmatched /country/*/movies/* requests to that file; the client
// then reads the real country_code and slug back off window.location at runtime.
export async function generateStaticParams() {
    return [{ country_code: "default", slug: "default" }];
}

interface PageProps {
    params: Promise<{ country_code: string; slug: string }>;
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

