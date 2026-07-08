"use client";
import { useState, useRef, useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  POKEMON_LIST,
  ALL_ITEMS,
  HabitatConfig,
  Location,
  pkmnIconUrl,
  dexNum,
} from "@/app/lib/const";

// ── Types ──────────────────────────────────────────────────────────────────

type Hit =
  | { kind: "pokemon";  slug: string; label: string; icon: string; num: string }
  | { kind: "item";     slug: string; label: string; icon?: string | null }
  | { kind: "habitat";  slug: string; label: string }
  | { kind: "location"; slug: string; label: string };

type HitKind = Hit["kind"];

const KIND_LABEL: Record<HitKind, string> = {
  pokemon:  "Pokémon",
  item:     "Item",
  habitat:  "Habitat",
  location: "Location",
};

function hitUrl(h: Hit): string {
  if (h.kind === "pokemon")  return `/pokemon/${h.slug}`;
  if (h.kind === "item")     return `/item/${h.slug}`;
  if (h.kind === "habitat")  return `/habitats/${h.slug}`;
  return `/locations/${h.slug}`;
}

// ── Search index (built once at module load) ───────────────────────────────

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const POKEMON_IDX: Hit[] = POKEMON_LIST.map((p) => ({
  kind: "pokemon", slug: p.slug, label: p.label,
  icon: pkmnIconUrl(p), num: dexNum(p),
}));
const ITEM_IDX: Hit[]     = ALL_ITEMS.map((it) => ({ kind: "item", slug: it.slug, label: it.label, icon: it.icon }));
const HABITAT_IDX: Hit[]  = Object.values(HabitatConfig).map((h) => ({ kind: "habitat", slug: h.slug, label: h.label }));
const LOCATION_IDX: Hit[] = Object.values(Location).map((l) => ({ kind: "location", slug: l.slug, label: l.label }));

function rank(hits: Hit[], nq: string, max: number): Hit[] {
  const prefix: Hit[] = [], contains: Hit[] = [];
  for (const h of hits) {
    const n = normalize(h.label);
    if (n.startsWith(nq)) prefix.push(h);
    else if (n.includes(nq)) contains.push(h);
  }
  return [...prefix, ...contains].slice(0, max);
}

function searchAll(q: string): Hit[] {
  const nq = normalize(q.trim());
  if (nq.length < 1) return [];
  return [
    ...rank(POKEMON_IDX, nq, 5),
    ...rank(ITEM_IDX,    nq, 5),
    ...rank(HABITAT_IDX, nq, 4),
    ...rank(LOCATION_IDX,nq, 4),
  ];
}

// ── Component ──────────────────────────────────────────────────────────────

export function GlobalSearch({
  placeholder,
  compact = false,
  className = "",
}: {
  placeholder?: string;
  compact?: boolean;
  className?: string;
}) {
  const { push } = useRouter();
  const listboxId = useId();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (blurTimer.current) clearTimeout(blurTimer.current); }, []);

  function handleInput(v: string) {
    setQuery(v);
    const results = searchAll(v);
    setHits(results);
    setActiveIdx(results.length > 0 ? 0 : -1);
    setOpen(results.length > 0);
  }

  function navigate(hit: Hit) {
    push(hitUrl(hit));
    setOpen(false);
    setQuery("");
    setHits([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || hits.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter")     { e.preventDefault(); const h = hits[activeIdx]; if (h) navigate(h); }
    else if (e.key === "Escape")    { setOpen(false); }
  }

  function handleBlur()  { blurTimer.current = setTimeout(() => setOpen(false), 150); }
  function handleFocus() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    if (hits.length > 0) setOpen(true);
  }

  const noResults = query.trim().length >= 2 && hits.length === 0;
  const ph = placeholder ?? (compact ? "Search…" : "Search Pokémon, items, habitats, locations…");

  // Build dropdown rows — insert a group header whenever kind changes
  const rows: React.ReactNode[] = [];
  let lastKind: HitKind | null = null;
  hits.forEach((hit, i) => {
    if (hit.kind !== lastKind) {
      lastKind = hit.kind;
      rows.push(
        <li key={`hdr-${hit.kind}`} role="presentation"
          className="px-4 py-[5px] font-mono text-[9px] uppercase tracking-[0.1em] text-ink-fade font-semibold bg-surface-1 border-b border-surface-1 first:rounded-t-[12px]">
          {KIND_LABEL[hit.kind]}
        </li>
      );
    }
    const icon =
      hit.kind === "pokemon" ? (
        <Image src={hit.icon} alt="" width={36} height={36} className="size-9 object-contain shrink-0" />
      ) : hit.kind === "item" && hit.icon ? (
        <Image src={hit.icon} alt="" width={28} height={28} className="size-7 object-contain shrink-0" />
      ) : null;

    rows.push(
      <li
        key={`${hit.kind}-${hit.slug}`}
        id={`${listboxId}-${i}`}
        role="option"
        aria-selected={i === activeIdx}
        tabIndex={-1}
        className={`flex items-center gap-3 px-4 py-[7px] cursor-pointer border-b border-surface-1 last:border-b-0 transition-colors hover:bg-surface-1 ${i === activeIdx ? "bg-surface-1" : ""}`}
        onMouseDown={(e) => { e.preventDefault(); navigate(hit); }}
      >
        {icon}
        <span className="flex-1 min-w-0 font-semibold text-[14px] text-ink truncate">{hit.label}</span>
        <span className="font-mono text-[9px] font-semibold tracking-[0.06em] uppercase text-ink-soft shrink-0">
          {KIND_LABEL[hit.kind]}
        </span>
      </li>
    );
  });

  const inputCls = compact
    ? "w-full font-outfit text-[12px] font-semibold text-ink bg-paper border border-[1.5px] border-paper-edge rounded-lg outline-none transition-all py-[6px] pr-3 pl-8 focus:border-accent focus:shadow-[0_0_0_2px_rgba(201,149,43,0.12)] placeholder:text-ink-fade placeholder:font-medium"
    : "w-full font-outfit text-[17px] font-semibold text-ink bg-paper border border-[1.5px] border-accent rounded-[10px] outline-none transition-all [padding:16px_20px_16px_50px] shadow-[0_0_0_4px_rgba(201,149,43,0.12),0_4px_12px_-4px_var(--shadow)] focus:border-accent-deep focus:shadow-[0_0_0_4px_rgba(138,105,25,0.18),0_4px_12px_-4px_var(--shadow)] placeholder:text-ink-fade placeholder:font-medium";

  const iconCls = compact
    ? "absolute left-[9px] top-1/2 -translate-y-1/2 text-[13px] text-accent-deep pointer-events-none"
    : "absolute left-[18px] top-1/2 -translate-y-1/2 text-[20px] text-accent-deep pointer-events-none";

  const activeDescendant =
    activeIdx >= 0 && hits[activeIdx] != null ? `${listboxId}-${activeIdx}` : undefined;

  return (
    <div className={`relative ${className}`}>
      <span className={iconCls}>⚲</span>
      <input
        type="text"
        role="combobox"
        className={inputCls}
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={ph}
        autoComplete="off"
        aria-label={ph}
        aria-autocomplete="list"
        aria-expanded={open && hits.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendant}
      />
      {open && hits.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute top-[calc(100%+6px)] left-0 right-0 bg-paper border border-[1.5px] border-paper-edge rounded-[14px] max-h-[380px] overflow-y-auto z-50 shadow-[0_12px_28px_-8px_var(--shadow)]"
        >
          {rows}
        </ul>
      )}
      {noResults && (
        <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-paper border border-[1.5px] border-paper-edge rounded-[14px] z-50 shadow-[0_12px_28px_-8px_var(--shadow)]">
          <div className="px-4 py-3 text-ink-fade italic text-[13px]">
            No results for &ldquo;{query}&rdquo;
          </div>
        </div>
      )}
    </div>
  );
}
