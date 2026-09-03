import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import PageSkeleton from "@/components/PageSkeleton";
import { fetchConfig } from "@/lib/config/app.config";
import { parseCampaignObject } from "@/lib/campaign/campaign.parser";
import { resolveCampaignPath } from "@/lib/campaign/campaign.resolver";
import { getAllCampaignPaths } from "@/services/campaign.service";
import InMovieCampaignClient from "@/components/campaign/InMovieCampaignClient";

const SUPPORTED_COUNTRY_CODES = ["in", "us"];

export async function generateStaticParams() {
  try {
    const paths = await getAllCampaignPaths();
    const uniqueSlugs = paths
      .map((path) => path.replace(/^\/+|\/+$/g, "").split("/"))
      .filter((slug) => slug.length > 0);

    const params = SUPPORTED_COUNTRY_CODES.flatMap((country_code) => [
      { country_code, slug: [] },
      ...uniqueSlugs.map((slug) => ({ country_code, slug })),
    ]);

    return [{ country_code: "default", slug: ["default"] }, ...params];
  } catch (error) {
    console.warn(
      "[country/[country_code]/[[...slug]]] Failed to fetch campaign config at build time",
      error
    );
    return [{ country_code: "default", slug: ["default"] }];
  }
}

interface PageProps {
  params: Promise<{
    country_code: string;
    slug?: string[];
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { country_code, slug = [] } = await params;
    if (!slug || slug.length === 0) {
      return { title: "JOJO Gold" };
    }

    const requestedPath = slug.join("/");
    const config = await fetchConfig();
    const campaignString = config?.devices?.platform?.misc?.[0]?.["campaign-object"];
    const campaign = parseCampaignObject(campaignString);
    const resolved = resolveCampaignPath(campaign, requestedPath);

    if (resolved?.item) {
      const item = resolved.item;
      const rawPoster = item.images?.poster || item.images?.posterMobile;
      const posterUrl = rawPoster
        ? (rawPoster.startsWith("http") ? rawPoster : `${item.imageBaseUrl || ""}${rawPoster}`)
        : undefined;

      const title = item.title ? `${item.title} - JOJO Gold` : "JOJO Gold";
      const description = item.title
        ? `Watch ${item.title} on JOJO Gold. Enjoy exclusive ${resolved.type}, ad-free streaming, and Full HD quality.`
        : "Get unlimited access to JOJO Gold. Enjoy exclusive content, no video ads, watch on up to 4 devices, and stream in Full HD 1080p.";

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `https://jojoapp.in/country/${country_code}/${item.path || requestedPath}`,
          siteName: "JOJO",
          images: posterUrl ? [{ url: posterUrl, alt: item.title || "Poster" }] : undefined,
          locale: "en_IN",
          type: resolved.type === "movies" ? "video.movie" : "video.tv_show",
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
    console.warn("[country/[country_code]/[[...slug]]] Failed to generate metadata", error);
  }

  return {
    title: "JOJO Gold",
  };
}

export default async function CountryCampaignPage({ params }: PageProps) {
  const { slug = [] } = await params;

  if (!slug || slug.length === 0) {
    redirect("/");
  }

  const requestedPath = slug.join("/");
  const config = await fetchConfig();
  const campaignString = config?.devices?.platform?.misc?.[0]?.["campaign-object"];
  const campaign = parseCampaignObject(campaignString);
  const resolved = resolveCampaignPath(campaign, requestedPath);

  if (!resolved) {
    notFound();
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
      <InMovieCampaignClient
        params={params}
        initialCampaign={{ ...resolved.item, type: resolved.type }}
        type={resolved.type}
      />
    </Suspense>
  );
}
