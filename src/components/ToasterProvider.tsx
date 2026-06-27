"use client";

import { Toaster } from "react-hot-toast";

export function ToasterProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        duration: 4000,
        style: {
          background: "#1c1a17",
          color: "#ffffff",
          border: "1px solid rgba(250, 175, 63, 0.3)",
          borderRadius: "12px",
          fontSize: "14px",
          fontFamily: "var(--font-poppins), sans-serif",
        },
        success: {
          iconTheme: {
            primary: "#FAAF3F",
            secondary: "#050505",
          },
        },
        error: {
          iconTheme: {
            primary: "#fc8181",
            secondary: "#050505",
          },
        },
      }}
    />
  );
}
