import Image from "next/image";
import { ImageOff } from "lucide-react";

/** Foto del piatto caricata dall'admin. Senza foto non mostra nulla (`emptyBox`: riquadro vuoto, per il pannello). */
export function ProductImage({
  src,
  alt,
  sizes = "(max-width: 640px) 40vw, 240px",
  className = "",
  priority = false,
  emptyBox = false,
}: {
  src: string | null;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  emptyBox?: boolean;
}) {
  if (!src && !emptyBox) return null;
  return (
    <div className={`relative overflow-hidden bg-crema-dark ${className}`}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" priority={priority} />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-pietra/50">
          <ImageOff className="h-1/3 w-1/3" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
