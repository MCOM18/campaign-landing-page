import { Suspense } from "react";
import type { Metadata } from "next";
import PageSkeleton from "@/components/PageSkeleton";
import { fetchConfig } from "@/lib/config/app.config";
import { resolveContentByPath } from "@/lib/content/resolveContentByPath";
import MovieCampaignClient from "./InMovieCampaignClient";

// Country codes aren't a bounded list known at build time in general, so this route also
// prebuilds a "default" fallback (country/default/movies/default.html) the same way it did
// before. Hosting can rewrite unmatched /country/*/movies/* requests to that file, and the
// client reads the real country_code and slug back off window.location at runtime.
//
// "in" is the one country this campaign is actually live for today (see
// appConfig.DEFAULT_COUNTRY_NAME / GEO_DEFAULT_COUNTRY_CODE), so we additionally prebuild a
// real static file per movie under /country/in/movies/<slug> — the same way movies/[slug]
// prebuilds every slug. That removes the dependency on a hosting-level rewrite for the one
// country that actually needs to work, without requiring one for every possible country.
// Add more codes here if/when this campaign goes live in additional countries.
const SUPPORTED_COUNTRY_CODES = ["in", "us"];

export async function generateStaticParams() {
    try {
        const config = await fetchConfig();
        const slugs = (config.movies ?? []).map((movie) => movie.slug).filter(Boolean);
        const uniqueSlugs = [...new Set(slugs)];

        const params = SUPPORTED_COUNTRY_CODES.flatMap((country_code) =>
            uniqueSlugs.map((slug) => ({ country_code, slug }))
        );

        return [{ country_code: "default", slug: "default" }, ...params];
    } catch (error) {
        console.warn("[country/[country_code]/movies/[slug]] Failed to fetch campaign config at build time, only 'default' will be prebuilt", error);
        return [{ country_code: "default", slug: "default" }];
    }
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

