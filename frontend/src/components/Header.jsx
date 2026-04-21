import { useEffect, useState } from "react";

export default function Header() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <div className="mb-8 flex items-center justify-between">
      <div className="text-[13px] text-fg3">caniswimatthecut.com</div>
      <button
        onClick={() => setDark((d) => !d)}
        className="cursor-pointer border border-line bg-transparent px-2.5 py-1 font-sans text-[11px] text-fg3 transition-colors hover:border-fg3 hover:text-fg"
      >
        {dark ? "light" : "dark"}
      </button>
    </div>
  );
}
