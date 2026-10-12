// Couleurs personnalisables des codes enfants A-E, partagees par tous les ecrans.
import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";

import { KEYS, kv } from "./storage";
import { childDefaultColors } from "@/src/theme";
import { ChildCode } from "@/src/types";

type ChildColors = Record<ChildCode, string>;

const Ctx = createContext<{ childColors: ChildColors; setChildColor: (c: ChildCode, color: string) => void }>({
  childColors: childDefaultColors,
  setChildColor: () => {},
});

export function ChildColorsProvider({ children }: { children: ReactNode }) {
  const [childColors, setColors] = useState<ChildColors>(childDefaultColors);

  useEffect(() => {
    kv.get<Partial<ChildColors>>(KEYS.childColors, {}).then((saved) =>
      setColors({ ...childDefaultColors, ...saved }),
    );
  }, []);

  const setChildColor = (code: ChildCode, color: string) => {
    setColors((prev) => {
      const next = { ...prev, [code]: color };
      kv.set(KEYS.childColors, next);
      return next;
    });
  };

  return createElement(Ctx.Provider, { value: { childColors, setChildColor } }, children);
}

export const useChildColors = () => useContext(Ctx);
