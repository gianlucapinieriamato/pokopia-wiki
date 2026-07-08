import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ALL_ITEMS, ITEM_BY_SLUG, Category, POKEMON_LIST, pkmnIconUrl, dexNum, ITEM_RECIPES, PASSIVE_DROPS } from "@/app/lib/const";
import type { ItemConst, CategoryConst } from "@/app/lib/const";
import JsonLd from "@/app/components/JsonLd";
import { SITE_URL } from "@/app/lib/config";
import PageWrap from "@/app/components/PageWrap";
import Breadcrumb from "@/app/components/Breadcrumb";
import Card from "@/app/components/Card";
import SectionTitle from "@/app/components/SectionTitle";
import PokemonGridCard from "@/app/components/PokemonGridCard";
import PokemonGrid from "@/app/components/PokemonGrid";

// Build a reverse map: item slug → categories that contain it
function getItemCategories(slug: string): CategoryConst[] {
  return Object.values(Category).filter((c) => c.items.some((i) => i.slug === slug));
}

export function generateStaticParams() {
  return ALL_ITEMS.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = ITEM_BY_SLUG[slug] ?? null;
  if (!item) return { title: "Not found" };
  const cats = getItemCategories(slug);
  const desc = cats.length > 0
    ? `${item.label} is a gift item in Pokemon Pokopia, appearing in ${cats.length} favorite ${cats.length === 1 ? "category" : "categories"}. Give it to Pokemon that like these categories to earn happiness.`
    : `${item.label} — a naturally occurring material in Pokemon Pokopia. Found in locations across the game.`;
  return { title: item.label, description: desc };
}

export default async function ItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = ITEM_BY_SLUG[slug] ?? null;
  if (!item) return <PageWrap><p>Item not found.</p></PageWrap>;

  const cats = getItemCategories(slug);

  const pokemonWhoLike = POKEMON_LIST
    .filter((p) => p.categories.some((c) => cats.some((cat) => cat.slug === c.slug)))
    .sort((a, b) => (a.nationalDexNum ?? 99999) - (b.nationalDexNum ?? 99999));

  const passiveDropSources = POKEMON_LIST
    .filter((p) => PASSIVE_DROPS[p.slug]?.slug === slug)
    .sort((a, b) => (a.nationalDexNum ?? 99999) - (b.nationalDexNum ?? 99999));

  const recipe = ITEM_RECIPES[slug];

  return (
    <PageWrap>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Items", item: `${SITE_URL}/items` },
          { "@type": "ListItem", position: 3, name: item.label, item: `${SITE_URL}/item/${slug}` },
        ],
      }} />
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Items", href: "/items" }, { label: item.label }]} />
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          {item.icon && (
            <div className="size-16 bg-surface-1 rounded-[10px] p-[6px] shrink-0">
              <div className="relative w-full h-full">
                <Image fill src={item.icon} alt={item.label} className="object-contain" sizes="64px" />
              </div>
            </div>
          )}
          <div className="font-outfit font-extrabold leading-[1.05] tracking-[-0.025em] text-[clamp(1.8rem,4vw,2.8rem)]">{item.label}</div>
        </div>
      </div>

      {recipe && (
        <Card>
          <SectionTitle>Crafting recipe</SectionTitle>
          <div className="mt-3 space-y-2">
            <div className="font-mono text-[11px] text-ink-soft tracking-[0.04em] font-medium uppercase mb-3">
              Unlock: <span className="text-ink normal-case not-[uppercase] font-semibold">{recipe.unlock}</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {recipe.materials.map((mat) => {
                const inner = (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-1 border border-paper-edge">
                    {mat.item.icon && (
                      <div className="relative size-8 shrink-0">
                        <Image fill src={mat.item.icon} alt={mat.item.label} className="object-contain" sizes="32px" />
                      </div>
                    )}
                    <div>
                      <div className="font-outfit font-semibold text-[13px] text-ink leading-tight">{mat.item.label}</div>
                      {mat.qty > 1 && <div className="font-mono text-[11px] text-ink-soft">×{mat.qty}</div>}
                    </div>
                  </div>
                );
                return (
                  <Link key={mat.item.slug} href={`/item/${mat.item.slug}`} className="no-underline">{inner}</Link>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle>Categories</SectionTitle>
        <div className="flex flex-wrap gap-2 mt-2 mb-4">
          {cats.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`} className="font-outfit text-[11px] font-bold px-[10px] py-1 rounded-full bg-surface-1 text-ink border border-[1.5px] border-paper-edge tracking-[0.04em] no-underline">
              {c.label}
            </Link>
          ))}
        </div>

        <SectionTitle>Pokemon that like this item</SectionTitle>
        <div className="font-mono text-[12px] text-ink-soft tracking-[0.04em] font-medium mb-3">{pokemonWhoLike.length} Pokemon</div>
        {pokemonWhoLike.length > 0 && (
          <PokemonGrid>
            {pokemonWhoLike.map((p) => (
              <PokemonGridCard key={p.slug} p={p} />
            ))}
          </PokemonGrid>
        )}
      </Card>

      {passiveDropSources.length > 0 && (
        <Card>
          <SectionTitle>Passively dropped by</SectionTitle>
          <div className="font-mono text-[12px] text-ink-soft tracking-[0.04em] font-medium mb-3">
            {passiveDropSources.length} Pokemon drop this near their home (Litter specialty)
          </div>
          <PokemonGrid>
            {passiveDropSources.map((p) => (
              <PokemonGridCard key={p.slug} p={p} />
            ))}
          </PokemonGrid>
        </Card>
      )}
    </PageWrap>
  );
}
