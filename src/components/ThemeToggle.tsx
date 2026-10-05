"use client";

import { useSyncExternalStore } from "react";
import { btnSecondary } from "./ui";

type Theme = "light" | "dark";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

function getSnapshot(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "dark" || set === "light") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, () => "light" as Theme);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("atlas-theme", next);
    } catch {
      /* private mode: the choice just will not persist */
    }
  }

  return (
    <button type="button" className={btnSecondary} onClick={toggle} aria-pressed={theme === "dark"} aria-label="Dark mode">
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
