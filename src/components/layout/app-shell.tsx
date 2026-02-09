"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import {
  ClipboardList,
  Command,
  Gauge,
  PlusCircle,
  Settings,
  Target,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/input";
import { useAppData } from "@/features/app/app-data-context";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/leads", label: "Leads", icon: Target },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const AppShell = ({ children }: PropsWithChildren) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const { leads } = useAppData();

  const quickMatches = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) {
      return [];
    }

    return leads
      .filter((lead) => lead.companyName.toLowerCase().includes(value))
      .slice(0, 5);
  }, [leads, search]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      const isTypingContext =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.getAttribute("contenteditable") === "true";

      if (event.key === "/" && !isTypingContext) {
        event.preventDefault();
        searchRef.current?.focus();
      }

      if (event.key.toLowerCase() === "n" && !isTypingContext) {
        event.preventDefault();
        router.push("/leads/new");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <div className="min-h-screen bg-command-bg text-slate-100">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-slate-800/80 bg-command-panel px-4 py-5 lg:border-b-0 lg:border-r">
          <div className="mb-8 flex items-center gap-2 text-cyan-200">
            <Command className="h-5 w-5" />
            <div>
              <p className="text-xs tracking-[0.2em] text-cyan-300/80">TU LEAD OS</p>
              <h1 className="text-sm font-semibold text-slate-100">Command Center</h1>
            </div>
          </div>

          <nav className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-all duration-150",
                    active
                      ? "border-cyan-400/60 bg-cyan-500/10 text-cyan-100"
                      : "border-slate-700/30 text-slate-300 hover:border-slate-500/60 hover:bg-slate-900/70",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-lg border border-slate-700/50 bg-slate-900/60 p-3 text-xs text-slate-400">
            <p className="font-semibold text-slate-200">Hotkeys</p>
            <p className="mt-1">`/` focus search</p>
            <p>`n` new lead</p>
          </div>
        </aside>

        <div className="flex min-h-screen flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-[#090e14]/90 px-4 py-3 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-xl">
                <Input
                  ref={searchRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search leads..."
                />
                {quickMatches.length > 0 ? (
                  <div className="absolute mt-2 w-full rounded-lg border border-slate-700/70 bg-[#111924] p-2 shadow-2xl">
                    {quickMatches.map((match) => (
                      <button
                        key={match.id}
                        className="block w-full rounded px-2 py-1 text-left text-sm text-slate-200 hover:bg-slate-800/80"
                        onClick={() => {
                          setSearch("");
                          router.push(`/leads/${match.id}`);
                        }}
                      >
                        {match.companyName}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/leads/new"
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 text-sm font-semibold text-cyan-100 transition-colors hover:bg-cyan-500/20"
                >
                  <PlusCircle className="h-4 w-4" />
                  New Lead
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-4 sm:px-6 sm:py-6">{children}</main>
        </div>
      </div>
    </div>
  );
};
