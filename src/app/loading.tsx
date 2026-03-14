export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0f1a]">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#8fa1c2]/20 border-t-[#8df65f]" />
        <p className="mt-4 text-sm font-medium tracking-wide text-[#8fa1c2]">
          Cargando...
        </p>
      </div>
    </div>
  );
}
