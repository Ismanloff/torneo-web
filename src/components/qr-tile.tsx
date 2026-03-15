import Image from "next/image";
import QRCode from "qrcode";

type QrTileProps = {
  href: string;
  label: string;
  note?: string;
  variant?: "app" | "public";
};

export async function QrTile({ href, label, note, variant = "app" }: QrTileProps) {
  const dataUrl = await QRCode.toDataURL(href, {
    margin: 1,
    width: 256,
    color: {
      dark: "#171311",
      light: "#FFF8EC",
    },
  });

  const isPublic = variant === "public";

  return (
    <div
      className={
        isPublic
          ? "public-soft mt-4 p-4 sm:p-5"
          : "app-soft-card mt-4"
      }
    >
      <div
        className={
          isPublic
            ? "mx-auto flex w-full max-w-56 justify-center rounded-[1.45rem] border border-white/8 bg-[rgba(255,248,236,0.96)] p-3 shadow-[0_18px_45px_rgba(3,6,17,0.24)]"
            : "mx-auto flex w-full max-w-56 justify-center rounded-[1.45rem] border border-white/8 bg-[rgba(255,248,236,0.96)] p-3"
        }
      >
        <Image
          alt={label}
          className="w-full rounded-2xl"
          height={256}
          src={dataUrl}
          width={256}
        />
      </div>
      <p
        className={
          isPublic
            ? "mt-4 text-center text-xs uppercase tracking-[0.2em] text-[#9fb3d9]"
            : "mt-4 text-center text-xs uppercase tracking-[0.18em] text-[var(--app-muted)]"
        }
      >
        {label}
      </p>
      {note ? (
        <p
          className={
            isPublic
              ? "mx-auto mt-2 max-w-xs text-center text-sm leading-6 text-[#a8b7d2]"
              : "mx-auto mt-2 max-w-xs text-center text-sm leading-6 text-[var(--app-muted)]"
          }
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
