import { ALLERGEN_MAP, TAG_MAP } from "@/lib/allergens";

export function TagBadges({ tags, className = "" }: { tags: string[]; className?: string }) {
  if (!tags.length) return null;
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map((t) => {
        const tag = TAG_MAP[t];
        if (!tag) return null;
        return (
          <span key={t} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${tag.className}`}>
            {tag.label}
          </span>
        );
      })}
    </div>
  );
}

export function AllergenIcons({ allergens, showLabels = false }: { allergens: string[]; showLabels?: boolean }) {
  if (!allergens.length) return null;
  const label = `Allergeni: ${allergens.map((a) => ALLERGEN_MAP[a]?.label ?? a).join(", ")}`;
  if (showLabels) {
    return (
      <ul className="flex flex-wrap gap-1.5" aria-label="Allergeni">
        {allergens.map((a) => (
          <li key={a} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs ring-1 ring-lava/10">
            <span aria-hidden="true">{ALLERGEN_MAP[a]?.icon}</span> {ALLERGEN_MAP[a]?.short ?? a}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <span className="inline-flex gap-0.5 text-sm" title={label} aria-label={label} role="img">
      {allergens.map((a) => (
        <span key={a} aria-hidden="true">{ALLERGEN_MAP[a]?.icon}</span>
      ))}
    </span>
  );
}
