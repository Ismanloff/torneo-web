import Image from "next/image";
import QRCode from "qrcode";

type QrTileProps = {
  href: string;
  label: string;
};

export async function QrTile({ href, label }: QrTileProps) {
  const dataUrl = await QRCode.toDataURL(href, {
    margin: 1,
    width: 256,
    color: {
      dark: "#171311",
      light: "#FFF8EC",
    },
  });

  return (
    <div className="app-soft-card mt-4">
      <Image
        alt={label}
        className="mx-auto w-full max-w-48 rounded-2xl"
        height={256}
        src={dataUrl}
        width={256}
      />
      <p className="mt-4 text-center text-xs uppercase tracking-[0.18em] text-[var(--app-muted)]">
        {label}
      </p>
    </div>
  );
}
