import { CampaignContentConfig } from "@/lib/config/app.config";

interface ShowDetailProps {
    show: CampaignContentConfig;
}

/**
 * Minimal placeholder for the show detail page. The real design isn't built yet —
 * this just proves the correct show object was resolved from appConfig and renders it.
 */
export default function ShowDetail({ show }: ShowDetailProps) {
    const posterSrc = show.images?.poster ? `${show.imageBaseUrl || ""}${show.images.poster}` : "";

    return (
        <main
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
                padding: "24px",
                textAlign: "center",
                background: show.panel?.background || show.panel?.backgroundHex || "#000",
                color: "#fff",
            }}
        >
            {posterSrc && (
                <img
                    src={posterSrc}
                    alt={show.title}
                    style={{ maxWidth: "280px", width: "100%", borderRadius: "12px" }}
                />
            )}
            <h1>{show.title}</h1>
            <p style={{ opacity: 0.7 }}>Show detail page coming soon.</p>
        </main>
    );
}
