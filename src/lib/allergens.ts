// I 14 allergeni del Reg. UE 1169/2011 (Allegato II)
export const ALLERGENS = [
  { code: "glutine", label: "Cereali contenenti glutine", short: "Glutine", icon: "🌾" },
  { code: "crostacei", label: "Crostacei", short: "Crostacei", icon: "🦐" },
  { code: "uova", label: "Uova", short: "Uova", icon: "🥚" },
  { code: "pesce", label: "Pesce", short: "Pesce", icon: "🐟" },
  { code: "arachidi", label: "Arachidi", short: "Arachidi", icon: "🥜" },
  { code: "soia", label: "Soia", short: "Soia", icon: "🫘" },
  { code: "latte", label: "Latte e derivati (lattosio)", short: "Latte", icon: "🥛" },
  { code: "frutta_guscio", label: "Frutta a guscio", short: "Frutta a guscio", icon: "🌰" },
  { code: "sedano", label: "Sedano", short: "Sedano", icon: "🥬" },
  { code: "senape", label: "Senape", short: "Senape", icon: "🟡" },
  { code: "sesamo", label: "Semi di sesamo", short: "Sesamo", icon: "⚪" },
  { code: "solfiti", label: "Anidride solforosa e solfiti", short: "Solfiti", icon: "🍷" },
  { code: "lupini", label: "Lupini", short: "Lupini", icon: "🌼" },
  { code: "molluschi", label: "Molluschi", short: "Molluschi", icon: "🦪" },
] as const;

export const ALLERGEN_MAP = Object.fromEntries(ALLERGENS.map((a) => [a.code, a]));

export const TAGS = [
  { code: "novita", label: "Novità", className: "bg-oro/15 text-oro-dark ring-oro/40" },
  { code: "consigliato", label: "Consigliato", className: "bg-brace/10 text-brace ring-brace/30" },
  { code: "piccante", label: "Piccante", className: "bg-red-100 text-red-800 ring-red-300" },
  { code: "vegetariano", label: "Vegetariano", className: "bg-basilico/10 text-basilico ring-basilico/30" },
  { code: "vegano", label: "Vegano", className: "bg-basilico/15 text-basilico ring-basilico/40" },
] as const;

export const TAG_MAP = Object.fromEntries(TAGS.map((t) => [t.code, t]));
