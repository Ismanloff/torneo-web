"use client";

import { useState, useRef, useCallback } from "react";

import { AdminPartidosTab } from "@/components/admin-partidos-tab";
import { AdminStaffTab } from "@/components/admin-staff-tab";
import { AdminConfigTab } from "@/components/admin-config-tab";

import type {
  AdminArrivalLogEntry,
  AdminMatchCheckinLogEntry,
  ScoreboardCategory,
  StaffProfileRow,
  TournamentRow,
} from "@/lib/types";

type Tab = "partidos" | "staff" | "config";

type AdminTabsProps = {
  categories: ScoreboardCategory[];
  staffProfiles: StaffProfileRow[];
  manualLookupError?: string;
  recentArrivals: AdminArrivalLogEntry[];
  recentMatchCheckins: AdminMatchCheckinLogEntry[];
  tournament: TournamentRow;
  totalTeams: number;
  totalMatches: number;
  activeStaffCount: number;
  surfacePath: string;
};

const TABS: { key: Tab; label: string }[] = [
  { key: "partidos", label: "Calendario" },
  { key: "staff", label: "Staff" },
  { key: "config", label: "Recursos" },
];

export function AdminTabs({
  categories,
  staffProfiles,
  manualLookupError,
  recentArrivals,
  recentMatchCheckins,
  tournament,
  totalTeams,
  totalMatches,
  activeStaffCount,
  surfacePath,
}: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>(manualLookupError ? "config" : "partidos");
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
      <div
        className="admin-tabs sticky top-[5.75rem] z-20"
        role="tablist"
        aria-label="Administración"
      >
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
            tournamentStartDate={tournament.start_date}
            surfacePath={surfacePath}
          />
        )}
        {activeTab === "staff" && (
          <AdminStaffTab staffProfiles={staffProfiles} />
        )}
        {activeTab === "config" && (
          <AdminConfigTab
            categories={categories}
            activeStaffCount={activeStaffCount}
            manualLookupError={manualLookupError}
            recentArrivals={recentArrivals}
            recentMatchCheckins={recentMatchCheckins}
            totalTeams={totalTeams}
            totalMatches={totalMatches}
          />
        )}
      </div>
    </div>
  );
}
