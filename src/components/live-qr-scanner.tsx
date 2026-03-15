"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QrScanner from "qr-scanner";

type ScannerState = "idle" | "starting" | "active" | "error" | "success";

function normalizeScannedUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export function LiveQrScanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [state, setState] = useState<ScannerState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [lastScan, setLastScan] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    QrScanner.hasCamera()
      .then((available) => {
        if (mounted) {
          setHasCamera(available);
        }
      })
      .catch(() => {
        if (mounted) {
          setHasCamera(false);
        }
      });

    return () => {
      mounted = false;
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, []);

  const helperText = useMemo(() => {
    if (state === "success") {
      return "QR detectado. Abriendo la ficha correspondiente...";
    }

    if (state === "active") {
      return "Apunta a un QR de equipo o partido. El enlace se abrirá automáticamente.";
    }

    if (error) {
      return error;
    }

    if (hasCamera === false) {
      return "Este dispositivo o navegador no expone cámara a la app. Registra el equipo manualmente desde Gestión.";
    }

    return "Abre la cámara y apunta al QR del equipo. La ficha se abrirá automáticamente.";
  }, [error, hasCamera, state]);

  const stopScanner = () => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    if (state !== "success") {
      setState("idle");
    }
  };

  const handleScanValue = (value: string) => {
    setLastScan(value);
    setState("success");
    const normalizedUrl = normalizeScannedUrl(value);

    if (normalizedUrl) {
      window.location.assign(normalizedUrl);
      return;
    }

    setError(`Se ha detectado un contenido no compatible: ${value}`);
    setState("error");
  };

  const startScanner = async () => {
    if (!videoRef.current || state === "starting" || state === "active") {
      return;
    }

    setError(null);
    setState("starting");

    try {
      if (!scannerRef.current) {
        scannerRef.current = new QrScanner(
          videoRef.current,
          (result) => {
            stopScanner();
            handleScanValue(result.data);
          },
          {
            preferredCamera: "environment",
            highlightScanRegion: true,
            highlightCodeOutline: true,
            returnDetailedScanResult: true,
          },
        );
      }

      await scannerRef.current.start();
      setState("active");
    } catch (scanError) {
      setState("error");
      setError(
        scanError instanceof Error
          ? scanError.message
          : "No se pudo abrir la cámara. Revisa permisos o usa la cámara nativa.",
      );
    }
  };

  return (
    <div className="grid gap-4">
      <div className="relative overflow-hidden rounded-[1.6rem] border border-[var(--app-line)] bg-[rgba(4,8,20,0.96)]">
        <video
          ref={videoRef}
          className="aspect-square w-full object-cover"
          muted
          playsInline
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent px-4 py-4 text-sm text-white/90">
          {helperText}
        </div>
      </div>

      <div className="grid gap-3">
        <button
          className="app-action"
          onClick={startScanner}
          type="button"
        >
          {state === "active" ? "Escaneando..." : "Abrir cámara"}
        </button>
      </div>

      {state === "active" ? (
        <button className="app-link-pill justify-center" onClick={stopScanner} type="button">
          Cerrar cámara
        </button>
      ) : null}

      {lastScan && state === "error" ? (
        <p className="app-soft-card px-4 py-3 text-sm text-[var(--app-muted)]">
          Último contenido detectado: <span className="font-mono text-[var(--app-text)]">{lastScan}</span>
        </p>
      ) : null}
    </div>
  );
}
