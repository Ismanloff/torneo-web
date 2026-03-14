"use client";

import { useState, useRef, useCallback } from "react";

import { AdminPartidosTab } from "@/components/admin-partidos-tab";
import { AdminStaffTab } from "@/components/admin-staff-tab";
import { AdminConfigTab } from "@/components/admin-config-tab";

import type { ScoreboardCategory, StaffProfileRow, TournamentRow } from "@/lib/types";

type Tab = "partidos" | "staff" | "config";

type AdminTabsProps = {
  categories: ScoreboardCategory[];
  staffProfiles: StaffProfileRow[];
  tournament: TournamentRow;
  totalTeams: number;
  totalMatches: number;
  activeStaffCount: number;
  surfacePath: string;
};

const TABS: { key: Tab; label: string }[] = [
  { key: "partidos", label: "Partidos" },
  { key: "staff", label: "Staff" },
  { key: "config", label: "Config" },
];

export function AdminTabs({
  categories,
  staffProfiles,
  tournament,
  totalTeams,
  totalMatches,
  activeStaffCount,
  surfacePath,
}: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("partidos");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      let next = index;
      if (e.key === "ArrowRight") {
        next = (index + 1) % TABS.length;
      } else if (e.key === "ArrowLeft") {
        next = (index - 1 + TABS.length) % TABS.length;
      } else if (e.key === "Home") {
        next = 0;
      } else if (e.key === "End") {
        next = TABS.length - 1;
      } else {
        return;
      }
      e.preventDefault();
      setActiveTab(TABS[next].key);
      tabRefs.current[next]?.focus();
    },
    [],
  );

  return (
    <div>
      {/* Tab bar */}
      <div className="admin-tabs sticky top-0 z-10 bg-[var(--app-bg)] border-b border-[var(--app-line)] shadow-[0_1px_3px_rgba(0,0,0,0.3)]" role="tablist" aria-label="Administracion">
        {TABS.map((tab, index) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              ref={(el) => { tabRefs.current[index] = el; }}
              id={`admin-tab-${tab.key}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`admin-tabpanel-${tab.key}`}
              tabIndex={isActive ? 0 : -1}
              className={`admin-tab ${isActive ? "admin-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={(e) => handleTabKeyDown(e, index)}
              type="button"
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div
        className="mt-6"
        role="tabpanel"
        id={`admin-tabpanel-${activeTab}`}
        aria-labelledby={`admin-tab-${activeTab}`}
      >
        {activeTab === "partidos" && (
          <AdminPartidosTab
            categories={categories}
            staffProfiles={staffProfiles}
            tournamentId={tournament.id}
            surfacePath={surfacePath}
          />
        )}
        {activeTab === "staff" && (
          <AdminStaffTab staffProfiles={staffProfiles} />
        )}
        {activeTab === "config" && (
          <AdminConfigTab
            categories={categories}
            tournament={tournament}
            activeStaffCount={activeStaffCount}
            totalTeams={totalTeams}
            totalMatches={totalMatches}
          />
        )}
      </div>
    </div>
  );
}
