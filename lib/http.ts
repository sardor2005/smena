import type { NextRequest } from "next/server";
/** Compare the browser origin to the public Host, not Next's internal bind address. */
export function sameOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const url = new URL(origin);
    return (
      ["http:", "https:"].includes(url.protocol) &&
      url.host === req.headers.get("host")
    );
  } catch {
    return false;
  }
}
