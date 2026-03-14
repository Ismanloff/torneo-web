"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type StaffMagicLinkFormProps = {
  nextPath?: string;
};

export function StaffMagicLinkForm({ nextPath = "/app" }: StaffMagicLinkFormProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);

        startTransition(async () => {
          const supabase = createSupabaseBrowserClient();
          const redirectUrl = new URL("/auth/confirm", window.location.origin);
          redirectUrl.searchParams.set("next", nextPath);

          const { error: signInError } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: redirectUrl.toString(),
            },
          });

          if (signInError) {
            setError(signInError.message);
            return;
          }

          setMessage("Te hemos enviado un enlace de acceso al correo indicado.");
        });
      }}
    >
      <label className="field-shell">
        <span className="field-label">Correo personal</span>
        <input
          required
          autoComplete="email"
          className="field-input"
          name="email"
          placeholder="arbitro@colegio.es"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>

      <button className="public-action" disabled={isPending} type="submit">
        <Mail className="h-4 w-4" />
        {isPending ? "Enviando..." : "Enviar magic link"}
      </button>

      {message ? <p className="text-sm text-[#a8b7d2]">{message}</p> : null}
      {error ? <p className="text-sm text-[#fecaca]">{error}</p> : null}
    </form>
  );
}
