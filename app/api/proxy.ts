const ALLOW = ["images.unsplash.com","i.imgur.com","cdn.yoursite.com"];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get("imageUrl");
  if (!imageUrl) return new Response("Missing imageUrl", { status: 400 });

  try {
    const url = new URL(imageUrl);
    if (!ALLOW.includes(url.host)) return new Response("Domain not allowed", { status: 403 });

    const r = await fetch(url.toString(), { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) return new Response("Upstream error", { status: 502 });

    const ct = r.headers.get("content-type");
    if (!ct?.startsWith("image")) return new Response("Not an image", { status: 400 });

    const buf = await r.arrayBuffer();
    return new Response(buf, {
      headers: {
        "Content-Type": ct,
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      }
    });
  } catch {
    return new Response("Bad URL", { status: 400 });
  }
}