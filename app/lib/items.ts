import { ALL_ITEMS } from "@/app/lib/const";

export type ResolvedItem = {
  displayName: string;
  slug: string | undefined;
  icon: string | null;
};

// Scraped names that differ from canonical item labels or correct display names
export const NAME_FIXES: Readonly<Record<string, string>> = {
  "Beautiful flower seeds": "Beautiful flower",
  "Elegant flower seed": "Elegant flower",
  "Wooden chair": "Wooden stool",
  "Grubby rag": "Grubby rags",
  Speakers: "Speaker",
  "Public chair": "Public Seat",
};

// Items whose icon filename differs from the name-derived path
export const ICON_OVERRIDES: Readonly<Record<string, string>> = {
  "Pecha tree seed": "/icons/items/pechaseeds.png",
  "Public chair": "/icons/items/publicseat.png",
  Speakers: "/icons/items/speaker.png",
  "PP Up": "/icons/items/ppup.png",
};

export function resolveItem(name: string): ResolvedItem {
  const displayName = NAME_FIXES[name] ?? name;
  if (ICON_OVERRIDES[name])
    return { icon: ICON_OVERRIDES[name]!, slug: undefined, displayName };

  const entry = ALL_ITEMS.find(
    (i) => i.label.toLowerCase() === displayName.toLowerCase()
  );
  if (entry) return { icon: entry.icon, slug: entry.slug, displayName };

  const baseName = name.endsWith(" Recipe") ? name.slice(0, -7) : name;
  const baseEntry = ALL_ITEMS.find(
    (i) => i.label.toLowerCase() === baseName.toLowerCase()
  );
  if (baseEntry) return { icon: baseEntry.icon, slug: baseEntry.slug, displayName };

  return { icon: null, slug: undefined, displayName };
}
