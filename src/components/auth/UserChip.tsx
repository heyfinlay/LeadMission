"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface MePayload {
  authenticated: boolean;
  user?: {
    id?: string | null;
    email?: string | null;
  } | null;
  provider?: string | null;
  providerUsername?: string | null;
  discordUsername?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
}

const readDisplayName = (payload: MePayload | null): string => {
  if (!payload?.authenticated) {
    return "Not signed in";
  }

  return (
    payload.providerUsername ||
    payload.discordUsername ||
    payload.fullName ||
    payload.user?.email ||
    payload.user?.id ||
    "Authenticated user"
  );
};

const readProviderLabel = (provider: string | null | undefined): string => {
  if (!provider) {
    return "Unknown";
  }

  if (provider.toLowerCase() === "discord") {
    return "Discord";
  }

  return provider;
};

export const UserChip = () => {
  const [data, setData] = useState<MePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await fetch("/api/me", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const payload = (await response.json().catch(() => null)) as MePayload | null;
      setData(payload);
    } catch {
      setData({ authenticated: false });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const providerLabel = readProviderLabel(data?.provider);
  const title = loading ? "Checking session..." : `Signed in as ${readDisplayName(data)}`;

  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-slate-700/60 px-2 py-1.5 text-xs text-slate-300">
      {data?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.avatarUrl} alt="User avatar" className="h-5 w-5 rounded-full object-cover" />
      ) : (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-700/70 text-[10px] font-semibold text-slate-200">
          U
        </span>
      )}
      <div className="leading-tight">
        <p className="max-w-[180px] truncate text-slate-200">{title}</p>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">{providerLabel}</p>
      </div>
      <button
        type="button"
        onClick={() => void load(true)}
        disabled={refreshing}
        className="inline-flex h-6 w-6 items-center justify-center rounded border border-slate-700/60 text-slate-300 transition-colors hover:border-slate-500 disabled:opacity-60"
        aria-label="Refresh session info"
        title="Refresh session info"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
};
