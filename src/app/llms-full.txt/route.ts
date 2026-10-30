import { buildLlmsFullTxt } from "@/lib/llms/content";

// Prerendered at build time, refreshed hourly so new campaign pages appear without a redeploy
export const dynamic = "force-static";
export const revalidate = 3600;

export async function GET() {
  return new Response(await buildLlmsFullTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
