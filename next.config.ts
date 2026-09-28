import type { NextConfig } from "next";
import { normalizeOrigin } from "./src/lib/site";

const supabaseOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL, "");
const supabaseHost = supabaseOrigin ? new URL(supabaseOrigin).hostname : "*.supabase.co";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }],
  },
};

export default nextConfig;
