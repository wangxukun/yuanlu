"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ visibility: "hidden" }}>{children}</div>;
  return React.createElement(NextThemesProvider, props, children);
}
