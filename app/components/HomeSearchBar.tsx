"use client";
import Link from "next/link";
import { POKEMON_LIST, ALL_ITEMS, HabitatConfig, Location } from "@/app/lib/const";
import Shortcut from "@/app/components/Shortcut";
import { GlobalSearch } from "@/app/components/GlobalSearch";

function pick<T extends { slug: string; label: string }>(
  list: T[],
  slug: string,
  hrefFn: (slug: string) => string,
): { label: string; href: string } | null {
  const found = list.find((x) => x.slug === slug);
  return found ? { label: found.label, href: hrefFn(found.slug) } : null;
}

const QUICK_PICKS: { label: string; href: string }[] = [
  pick(POKEMON_LIST,                  "pikachu",     (s) => `/pokemon/${s}`),
  pick(ALL_ITEMS,                     "alarm-clock", (s) => `/item/${s}`),
  pick(Object.values(HabitatConfig),  "beachset",    (s) => `/habitats/${s}`),
  pick(POKEMON_LIST,                  "eevee",       (s) => `/pokemon/${s}`),
  pick(Object.values(Location),       "palettetown", (s) => `/locations/${s}`),
].filter((x): x is { label: string; href: string } => x !== null);

export function HomeSearchBar() {
  return (
    <>
      <GlobalSearch />
      <div className="mt-4 flex gap-2 flex-wrap items-center">
        <span className="font-mono text-[11px] text-ink-fade tracking-[0.08em] font-semibold">
          Try:
        </span>
        {QUICK_PICKS.map((pick) => (
          <Link key={pick.href} href={pick.href} className="no-underline">
            <Shortcut>{pick.label}</Shortcut>
          </Link>
        ))}
      </div>
    </>
  );
}
