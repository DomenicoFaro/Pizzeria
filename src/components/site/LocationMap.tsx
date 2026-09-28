"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="h-full min-h-80 w-full animate-pulse bg-lava/10" />,
});

export function LocationMap({ className }: { className?: string }) {
  return <MapView className={className} />;
}
