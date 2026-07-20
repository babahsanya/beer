import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BeerID — Пивной справочник",
    short_name: "BeerID",
    description: "Персональный журнал и гид по пиву: каталог, рейтинги, дегустационные заметки, рекомендации.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#f59e0b",
    orientation: "portrait-primary",
    lang: "ru",
    dir: "ltr",
    categories: ["food", "lifestyle", "utilities"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Поиск пива", short_name: "Поиск", url: "/?view=search" },
      { name: "Случайное пиво", short_name: "Случайное", url: "/?view=roulette" },
      { name: "Журнал дегустаций", short_name: "Журнал", url: "/?view=journal" },
    ],
  };
}
