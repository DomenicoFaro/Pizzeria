"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CartLine, OrderType } from "@/lib/types";
import { round2 } from "@/lib/pricing";

const STORAGE_KEY = "ristoro-cart-v1";

type CartState = {
  lines: CartLine[];
  mode: OrderType;
};

type CartContextValue = CartState & {
  hydrated: boolean;
  count: number;
  subtotal: number;
  /** incrementa a ogni aggiunta: usato per l'animazione dell'icona */
  bump: number;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  setMode: (mode: OrderType) => void;
  addLine: (line: Omit<CartLine, "key">) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
  /** aggiorna i prezzi con quelli ricalcolati dal server */
  syncPrices: (prices: { productId: string; unitPrice: number }[]) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function lineKey(l: Omit<CartLine, "key" | "quantity">): string {
  return [l.productId, [...l.modifierIds].sort().join("."), [...l.removed].sort().join("."), l.notes.trim()].join("|");
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<CartState>({ lines: [], mode: "delivery" });
  const [hydrated, setHydrated] = useState(false);
  const [bump, setBump] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CartState>;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- idratazione da localStorage
        setState({
          lines: Array.isArray(parsed.lines) ? parsed.lines : [],
          mode: parsed.mode === "pickup" ? "pickup" : "delivery",
        });
      }
    } catch {
      /* storage non disponibile */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage non disponibile */
    }
  }, [state, hydrated]);

  const addLine = useCallback((line: Omit<CartLine, "key">) => {
    const key = lineKey(line);
    setState((s) => {
      const existing = s.lines.find((l) => l.key === key);
      const lines = existing
        ? s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, l.quantity + line.quantity) } : l))
        : [...s.lines, { ...line, key }];
      return { ...s, lines };
    });
    setBump((b) => b + 1);
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setState((s) => ({
      ...s,
      lines: quantity <= 0 ? s.lines.filter((l) => l.key !== key) : s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(50, quantity) } : l)),
    }));
  }, []);

  const removeLine = useCallback((key: string) => setState((s) => ({ ...s, lines: s.lines.filter((l) => l.key !== key) })), []);
  const clear = useCallback(() => setState((s) => ({ ...s, lines: [] })), []);
  const setMode = useCallback((mode: OrderType) => setState((s) => ({ ...s, mode })), []);

  const syncPrices = useCallback((prices: { productId: string; unitPrice: number }[]) => {
    setState((s) => {
      if (prices.length !== s.lines.length) return s;
      let changed = false;
      const lines = s.lines.map((l, i) => {
        const p = prices[i];
        if (p && p.productId === l.productId && p.unitPrice !== l.unitPrice) {
          changed = true;
          return { ...l, unitPrice: p.unitPrice };
        }
        return l;
      });
      return changed ? { ...s, lines } : s;
    });
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const count = state.lines.reduce((s, l) => s + l.quantity, 0);
    const subtotal = round2(state.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0));
    return {
      ...state,
      hydrated,
      count,
      subtotal,
      bump,
      drawerOpen,
      setDrawerOpen,
      setMode,
      addLine,
      updateQuantity,
      removeLine,
      clear,
      syncPrices,
    };
  }, [state, hydrated, bump, drawerOpen, setMode, addLine, updateQuantity, removeLine, clear, syncPrices]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve essere usato dentro <CartProvider>");
  return ctx;
}
