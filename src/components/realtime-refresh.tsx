"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type RealtimeRefreshProps = {
  channelName: string;
  tables: string[];
};

export function RealtimeRefresh({ channelName, tables }: RealtimeRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const channel = supabase.channel(channelName);

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
        },
        () => {
          if (refreshTimeout) {
            clearTimeout(refreshTimeout);
          }

          refreshTimeout = setTimeout(() => {
            router.refresh();
          }, 250);
        },
      );
    }

    channel.subscribe();

    return () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      void supabase.removeChannel(channel);
    };
  }, [channelName, router, tables]);

  return null;
}
