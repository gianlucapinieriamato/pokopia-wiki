import type { MetadataRoute } from "next";
export const dynamic = "force-static";
import {
  POKEMON_BY_SLUG,
  Category,
  ALL_ITEMS,
  Specialty,
  HabitatConfig,
  Location,
  PokemonType,
} from "@/app/lib/const";
import { SITE_URL } from "@/app/lib/config";

const LAST_UPDATED = new Date("2026-06-20"); // update this when data changes

export default function sitemap(): MetadataRoute.Sitemap {

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`,            lastModified: LAST_UPDATED, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${SITE_URL}/pokedex/`,    lastModified: LAST_UPDATED, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${SITE_URL}/items/`,      lastModified: LAST_UPDATED, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${SITE_URL}/specialty/`,  lastModified: LAST_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/habitats/`,   lastModified: LAST_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/locations/`,  lastModified: LAST_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/types/`,      lastModified: LAST_UPDATED, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/matchmaker/`, lastModified: LAST_UPDATED, changeFrequency: "weekly",  priority: 0.7 },
  ];

  const pokemonRoutes: MetadataRoute.Sitemap = Object.values(POKEMON_BY_SLUG).map((p) => ({
    url: `${SITE_URL}/pokemon/${p.slug}/`,
    lastModified: LAST_UPDATED, changeFrequency: "monthly", priority: 0.7,
  }));

  const categoryRoutes: MetadataRoute.Sitemap = Object.values(Category).map((c) => ({
    url: `${SITE_URL}/category/${c.slug}/`,
    lastModified: LAST_UPDATED, changeFrequency: "monthly", priority: 0.6,
  }));

  const itemRoutes: MetadataRoute.Sitemap = ALL_ITEMS.map((item) => ({
    url: `${SITE_URL}/item/${item.slug}/`,
    lastModified: LAST_UPDATED, changeFrequency: "monthly", priority: 0.5,
  }));

  const specialtyRoutes: MetadataRoute.Sitemap = Object.values(Specialty).map((s) => ({
    url: `${SITE_URL}/specialty/${s.slug}/`,
    lastModified: LAST_UPDATED, changeFrequency: "monthly", priority: 0.6,
  }));

  const habitatRoutes: MetadataRoute.Sitemap = Object.values(HabitatConfig).map((h) => ({
    url: `${SITE_URL}/habitats/${h.slug}/`,
    lastModified: LAST_UPDATED, changeFrequency: "monthly", priority: 0.5,
  }));

  const locationRoutes: MetadataRoute.Sitemap = Object.values(Location).map((l) => ({
    url: `${SITE_URL}/locations/${l.slug}/`,
    lastModified: LAST_UPDATED, changeFrequency: "monthly", priority: 0.5,
  }));

  const typeRoutes: MetadataRoute.Sitemap = Object.values(PokemonType).map((t) => ({
    url: `${SITE_URL}/types/${t.slug}/`,
    lastModified: LAST_UPDATED, changeFrequency: "monthly", priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...pokemonRoutes,
    ...categoryRoutes,
    ...itemRoutes,
    ...specialtyRoutes,
    ...habitatRoutes,
    ...locationRoutes,
    ...typeRoutes,
  ];
}
