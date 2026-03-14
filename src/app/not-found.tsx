import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0f1a] px-4 text-white">
      <div className="w-full max-w-md text-center">
        <p className="text-[8rem] font-black leading-none tracking-tighter text-[#8fa1c2]/30">
          404
        </p>

        <h1 className="mt-2 text-xl font-bold tracking-tight">
          Pagina no encontrada
        </h1>

        <p className="mt-3 text-sm text-[#8fa1c2]">
          La pagina que buscas no existe o fue movida.
        </p>

        <div className="mt-8">
          <Link href="/" className="app-action">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
