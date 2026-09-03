import { CampaignRenderer } from "@/components/campaign/CampaignRenderer";
import HomePage from "@/components/home/HomePage";
import { parseCampaignObject } from "@/lib/campaign/campaign.parser";
import { resolveCampaignPath } from "@/lib/campaign/campaign.resolver";
import { fetchConfig } from "@/lib/config/app.config";
import { logger } from "@/lib/logger/logger";
import { getAllCampaignPaths } from "@/services/campaign.service";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    slug?: string[];
  }>;
}

export async function generateStaticParams() {
  try {
    const paths = await getAllCampaignPaths();
    const staticParams: { slug?: string[] }[] = [{ slug: [] }];

    for (const path of paths) {
      if (path && typeof path === "string") {
        const cleanPath = path.replace(/^\/+|\/+$/g, "");
        if (cleanPath) {
          staticParams.push({ slug: cleanPath.split("/") });
        }
      }
    }

    return staticParams;
  } catch (error) {
    console.warn("[[[...slug]]] Failed to fetch campaign config at build time", error);
    return [{ slug: [] }, { slug: ["default"] }];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { slug = [] } = await params;
    if (!slug || slug.length === 0) {
      return {
        title: "JOJO - 7 Days Free Trial",
        description: "Get unlimited access to JOJO Gold. Enjoy exclusive content, no video ads, watch on up to 4 devices, and stream in Full HD 1080p.",
      };
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
          url: `https://jojoapp.in/${item.path || requestedPath}`,
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
    console.warn("[[[...slug]]] Failed to generate metadata", error);
  }

  return {
    title: "JOJO Gold",
  };
}

export default async function CampaignPage({ params }: PageProps) {
  const { slug = [] } = await params;

  // Root URL "/" matches optional catch-all with empty slug
  if (!slug || slug.length === 0) {
    return <HomePage />;
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
    <CampaignRenderer
      type={resolved.type}
      item={{ ...resolved.item, type: resolved.type }}
    />
  );
}
