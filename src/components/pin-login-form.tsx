"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { loginWithPinAction } from "@/app/admin/actions";

type PinLoginFormProps = {
  error?: string | null;
};

export function PinLoginForm({ error }: PinLoginFormProps) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [isPending, startTransition] = useTransition();
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, [error]);

  const submit = useCallback((pin: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("pin", pin);
      await loginWithPinAction(fd);
    });
  }, []);

  const handleChange = useCallback(
    (index: number, value: string) => {
      const digit = value.replace(/\D/g, "").slice(-1);

      setDigits((prev) => {
        const next = [...prev];
        next[index] = digit;

        if (digit && index === 5 && next.every((d) => d.length === 1)) {
          submit(next.join(""));
        }

        return next;
      });

      if (digit && index < 5) {
        refs.current[index + 1]?.focus();
      }
    },
    [submit],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !digits[index] && index > 0) {
        refs.current[index - 1]?.focus();
      }
    },
    [digits],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

      if (!pasted) {
        return;
      }

      const next = Array(6).fill("");

      for (let i = 0; i < pasted.length; i++) {
        next[i] = pasted[i];
      }

      setDigits(next);

      if (pasted.length === 6) {
        submit(pasted);
      } else {
        refs.current[pasted.length]?.focus();
      }
    },
    [submit],
  );

  const filledCount = digits.filter((d) => d).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8fa1c2]">
          PIN de 6 dígitos
        </p>
        <p className="font-mono text-xs text-[#8fa1c2]">{filledCount}/6</p>
      </div>

      <div className="mb-7 h-[2px] overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${(filledCount / 6) * 100}%`,
            background: "linear-gradient(90deg, #8df65f, #54d12b)",
            boxShadow: filledCount > 0 ? "0 0 14px rgba(141, 246, 95, 0.5)" : "none",
          }}
        />
      </div>

      <div className={`flex justify-center gap-2.5 sm:gap-3 ${error ? "pin-shake" : ""}`}>
        {digits.map((digit, i) => (
          <div key={i} className="relative">
            <input
              ref={(el) => {
                refs.current[i] = el;
              }}
              aria-label={`Dígito ${i + 1} de 6`}
              autoComplete="one-time-code"
              className={[
                "h-14 w-12 sm:h-16 sm:w-[3.4rem]",
                "font-mono text-center text-2xl font-bold sm:text-3xl",
                "rounded-[1.1rem] border outline-none",
                "bg-white/[0.035] text-[var(--app-text)]",
                "transition-all duration-200",
                digit
                  ? "border-[rgba(141,246,95,0.4)] shadow-[0_0_20px_rgba(141,246,95,0.1)]"
                  : "border-white/[0.1]",
                isPending ? "pointer-events-none opacity-40" : "",
                "focus:border-[rgba(141,246,95,0.5)] focus:shadow-[0_0_28px_rgba(141,246,95,0.14)]",
              ].join(" ")}
              disabled={isPending}
              inputMode="numeric"
              maxLength={1}
              pattern="[0-9]"
              style={{ caretColor: "#8df65f" }}
              type="text"
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
            />
            {digit && (
              <span
                className="absolute -bottom-2.5 left-1/2 block h-1 w-1 -translate-x-1/2 rounded-full"
                style={{
                  background: "#8df65f",
                  boxShadow: "0 0 6px 2px rgba(141, 246, 95, 0.5)",
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 min-h-[1.5rem] text-center">
        {isPending ? (
          <p className="animate-pulse text-sm font-bold uppercase tracking-[0.2em] text-[var(--app-accent)]">
            Verificando...
          </p>
        ) : error ? (
          <p className="text-sm font-medium text-[#fca5a5]">
            PIN incorrecto. Inténtalo de nuevo.
          </p>
        ) : (
          <p className="text-sm text-[var(--app-muted)]">
            Introduce tu PIN de 6 dígitos
          </p>
        )}
      </div>
    </div>
  );
}
