import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-lava-texture flex min-h-dvh flex-col items-center justify-center p-6 text-center text-crema">
      <p className="font-serif text-7xl font-bold text-oro">404</p>
      <h1 className="mt-4 font-serif text-3xl">Questa pagina è finita sotto la lava</h1>
      <p className="mt-2 text-crema/75">Ma la pizza è ancora calda.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="inline-flex h-12 items-center rounded-full border border-crema/30 px-6 font-semibold">Home</Link>
        <Link href="/ordina" className="inline-flex h-12 items-center rounded-full bg-brace px-6 font-semibold text-white">Ordina</Link>
      </div>
    </div>
  );
}
