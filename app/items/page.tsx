import type { Metadata } from "next";
import { ALL_ITEMS, Category, POKEMON_LIST } from "@/app/lib/const";
import type { ItemConst, CategoryConst } from "@/app/lib/const";
import JsonLd from "@/app/components/JsonLd";
import { SITE_URL } from "@/app/lib/config";

export const metadata: Metadata = {
  title: "Items & Gift Categories",
  description: `Browse all gift items and categories in Pokemon Pokopia. Filter by category to find the perfect item for any Pokemon.`,
};
import { Suspense } from "react";
import ItemsClient from "./ItemsClient";
import PageWrap from "@/app/components/PageWrap";
import Breadcrumb from "@/app/components/Breadcrumb";
import PageHeader from "@/app/components/PageHeader";

const ALL_CATS = Object.values(Category);

const pkmnCountByCat: Record<string, number> = {};
for (const p of POKEMON_LIST) {
  for (const cat of p.categories) {
    pkmnCountByCat[cat.slug] = (pkmnCountByCat[cat.slug] ?? 0) + 1;
  }
}

export default function ItemsPage() {
  return (
    <PageWrap>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Items & Gift Categories",
        description: `Browse all ${ALL_ITEMS.length} gift items and ${ALL_CATS.length} categories in Pokemon Pokopia.`,
        url: `${SITE_URL}/items`,
      }} />
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Items" }]} />
      <PageHeader title="Items" />
      <Suspense fallback={<div className="font-mono text-[12px] text-ink-soft py-8 text-center">Loading…</div>}>
        <ItemsClient items={ALL_ITEMS} categories={ALL_CATS} pkmnCountByCat={pkmnCountByCat} />
      </Suspense>
    </PageWrap>
  );
}
