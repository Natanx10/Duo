
export type Theme = "light" | "dark" | "system";

export function getTheme(): Theme {
  return (localStorage.getItem("duo-theme") as Theme) || "system";
}

export function setTheme(theme: Theme) {
  localStorage.setItem("duo-theme", theme);
  applyTheme(theme);
}

export function applyTheme(theme: Theme) {
  const root = window.document.documentElement;
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (isDark) {
    root.classList.add("dark");
    root.classList.remove("light");
    root.setAttribute("data-theme", "dark");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
    root.setAttribute("data-theme", "light");
  }
}

export function initTheme() {
  if (typeof window === "undefined") return;
  applyTheme(getTheme());

  // Watch for system changes
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (getTheme() === "system") {
      applyTheme("system");
    }
  });
}
