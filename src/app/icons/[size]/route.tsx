import { ImageResponse } from "next/og";
import { IconArt } from "@/lib/icon-art";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ size: "192" }, { size: "512" }, { size: "maskable" }];
}

export async function GET(_req: Request, ctx: RouteContext<"/icons/[size]">) {
  const { size } = await ctx.params;
  const px = size === "192" ? 192 : 512;
  // maskable: margine di sicurezza del 20%
  const padding = size === "maskable" ? Math.round(px * 0.2) : Math.round(px * 0.06);
  return new ImageResponse(<IconArt size={px} padding={padding} />, { width: px, height: px });
}
