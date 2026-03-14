"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function AdminModal({ isOpen, onClose, title, children }: AdminModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
      // Focus first focusable element after render
      requestAnimationFrame(() => {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (focusable && focusable.length > 0) {
          focusable[0].focus();
        }
      });
    } else if (previousFocusRef.current instanceof HTMLElement) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
        return;
      }
      if (e.key === "Tab" && isOpen && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        className="admin-modal-card relative mx-4 w-full max-w-[480px] max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--app-line)] bg-[var(--app-surface-strong)] p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h3
            id="admin-modal-title"
            className="text-sm font-bold uppercase tracking-[0.24em] text-[var(--app-accent)]"
          >
            {title}
          </h3>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--app-line)] bg-white/5 text-[var(--app-muted)] transition-colors hover:bg-white/10 hover:text-white"
            onClick={onClose}
            type="button"
            aria-label="Cerrar"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
