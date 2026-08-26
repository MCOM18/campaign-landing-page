import { CampaignContentConfig } from "@/lib/config/app.config";

export type ContentType = "movie" | "show";

export interface ContentRouteResult {
    type: ContentType;
    data: CampaignContentConfig;
}

interface ContentConfigSource {
    movies?: CampaignContentConfig[];
    shows?: CampaignContentConfig[];
}

/**
 * Strips leading/trailing slashes so "/movies/dhabkaaro/" and "movies/dhabkaaro"
 * both normalize to "movies/dhabkaaro", matching the `path` field from the config.
 */
export function normalizeContentPath(pathname: string): string {
    return pathname.replace(/^\/+/, "").replace(/\/+$/, "");
}

function findByPath(
    items: CampaignContentConfig[] | undefined,
    normalizedPath: string
): CampaignContentConfig | undefined {
    return (items ?? []).find(
        (item) => item?.path && normalizeContentPath(item.path) === normalizedPath
    );
}

/**
 * Resolves a browser pathname against the appConfig-driven movies/shows lists.
 * Returns null when nothing matches, so the caller can redirect home.
 */
export function resolveContentByPath(
    pathname: string,
    config: ContentConfigSource
): ContentRouteResult | null {
    const normalized = normalizeContentPath(pathname);
    if (!normalized) return null;

    const movie = findByPath(config.movies, normalized);
    if (movie) return { type: "movie", data: movie };

    const show = findByPath(config.shows, normalized);
    if (show) return { type: "show", data: show };

    return null;
}
