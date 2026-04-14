import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Web KIS – Krankenhausinformationssystem",
    short_name: "Web KIS",
    description: "Meierhofer Krankenhausinformationssystem",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2a2a2e",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-light-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  }
}
