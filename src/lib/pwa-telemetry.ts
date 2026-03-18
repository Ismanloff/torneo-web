type PwaTelemetryName =
  | "install_prompt_shown"
  | "install_prompt_dismissed"
  | "install_prompt_accepted"
  | "update_ready"
  | "update_applied"
  | "push_prompt_shown"
  | "push_prompt_granted"
  | "push_prompt_denied"
  | "offline_queue_pending"
  | "offline_queue_syncing"
  | "offline_queue_synced"
  | "offline_queue_failed"
  | "storage_persist_granted"
  | "storage_persist_denied"
  | "storage_persist_unavailable";

type PwaTelemetryRecord = {
  name: PwaTelemetryName;
  at: string;
  path: string;
  detail?: Record<string, unknown>;
};

const STORAGE_KEY = "torneo-pwa-telemetry";
const MAX_EVENTS = 40;

export function trackPwaEvent(
  name: PwaTelemetryName,
  detail?: Record<string, unknown>,
) {
  if (typeof window === "undefined") {
    return;
  }

  const record: PwaTelemetryRecord = {
    name,
    at: new Date().toISOString(),
    path: window.location.pathname,
    detail,
  };

  try {
    const previous = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as PwaTelemetryRecord[];
    previous.unshift(record);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(previous.slice(0, MAX_EVENTS)));
  } catch {
    // Local telemetry should never block UI.
  }

  window.dispatchEvent(new CustomEvent("torneo:pwa-telemetry", { detail: record }));

  if (process.env.NODE_ENV !== "production") {
    console.info("[pwa-telemetry]", record);
  }
}
