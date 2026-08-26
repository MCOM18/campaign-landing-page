"use client";

import PageSkeleton from "@/components/PageSkeleton";
import ShowDetail from "@/components/ShowDetail";
import { useBootstrap } from "@/lib/bootstrap/BootstrapContext";
import { AppConfig } from "@/lib/config/app.config";
import { resolveContentByPath } from "@/lib/content/resolveContentByPath";
import { useParams, useRouter } from "next/navigation";
import { use, useEffect } from "react";

// This app builds as a static export, so the server only ever generates a "default"
// placeholder page for this route. The real path the visitor requested must be read
// from the browser's own URL instead of the route params.
const getShowPathname = (
    resolvedParams?: { slug?: string } | null,
    routeParams?: any
): string => {
    if (typeof window !== "undefined") {
        return window.location.pathname;
    }
    const slug = (resolvedParams?.slug || routeParams?.slug || "") as string;
    return slug && slug !== "default" ? `/shows/${slug}` : "";
};

interface ShowCampaignClientProps {
    params: Promise<{ slug: string }>;
}

export default function ShowCampaignClient({ params }: ShowCampaignClientProps) {
    const router = useRouter();
    const routeParams = useParams();
    const resolvedParams = params ? use(params) : null;
    const { isAppReady } = useBootstrap();

    const pathname = getShowPathname(resolvedParams, routeParams);

    // Show content resolved directly from appConfig's devices.platform.misc[].campaign-object,
    // matched against the browser pathname (e.g. "/shows/example-show" -> path "shows/example-show").
    const contentResult = isAppReady
        ? resolveContentByPath(pathname, { movies: AppConfig.movies, shows: AppConfig.shows })
        : undefined;
    const show = contentResult?.type === "show" ? contentResult.data : undefined;

    // Redirect home if the path doesn't resolve to a configured show
    useEffect(() => {
        if (isAppReady && !show) {
            router.replace("/");
        }
    }, [isAppReady, show, router]);

    if (!isAppReady || !show) {
        return <PageSkeleton />;
    }

    return <ShowDetail show={show} />;
}
