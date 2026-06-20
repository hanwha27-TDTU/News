// supabase/functions/uz-news/index.ts
// Supabase Edge Function (Deno) — fetches Uzbek local news RSS server-side
// (no browser CORS), parses to JSON, returns last 7 days deduped.
//
// Deploy:  supabase functions deploy uz-news --no-verify-jwt
// Call:    GET {SUPABASE_URL}/functions/v1/uz-news

const FEEDS: { url: string; source: string; lang: string }[] = [
  { url: "https://kun.uz/uz/rss",        source: "Kun.uz",      lang: "uz" },
  { url: "https://www.gazeta.uz/uz/rss", source: "Gazeta.uz",   lang: "uz" },
  { url: "https://daryo.uz/rss",         source: "Daryo",       lang: "uz" },
  { url: "https://uza.uz/uz/rss",        source: "UzA",         lang: "uz" },
  { url: "https://qalampir.uz/rss",      source: "Qalampir.uz", lang: "uz" },
  { url: "https://xabar.uz/rss",         source: "Xabar.uz",    lang: "uz" },
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const ENT: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#39;": "'", "&apos;": "'", "&nbsp;": " ", "&laquo;": "«", "&raquo;": "»",
};

function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1] : "";
}

function clean(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&[a-z#0-9]+;/gi, (e) => ENT[e.toLowerCase()] ?? e)
    .replace(/\s+/g, " ")
    .trim();
}

function image(itemXml: string): string {
  const m =
    itemXml.match(/<media:content[^>]*url=["']([^"']+)["']/i) ||
    itemXml.match(/<enclosure[^>]*url=["']([^"']+)["']/i) ||
    itemXml.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i);
  if (m) return m[1];
  const im = tag(itemXml, "description").match(/<img[^>]*src=["']([^"']+)["']/i);
  return im ? im[1] : "";
}

function linkOf(itemXml: string): string {
  // RSS 2.0: <link>url</link> ; Atom: <link href="url"/>
  const t = clean(tag(itemXml, "link"));
  if (t && /^https?:/i.test(t)) return t;
  const h = itemXml.match(/<link[^>]*href=["']([^"']+)["']/i);
  return h ? h[1] : "";
}

async function fetchFeed(f: { url: string; source: string; lang: string }) {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(f.url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Mozilla/5.0 (NewsDesk RSS)" },
    });
    clearTimeout(to);
    if (!r.ok) return [];
    const xml = await r.text();
    const items = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map((m) => m[0]).slice(0, 20);
    return items
      .map((it) => {
        const ts = Date.parse(clean(tag(it, "pubDate"))) || Date.now();
        return {
          url: linkOf(it),
          title: clean(tag(it, "title")),
          description: clean(tag(it, "description")).slice(0, 400),
          published_at: new Date(ts).toISOString(),
          image: image(it),
          source: f.source,
          lang: f.lang,
        };
      })
      .filter((a) => a.url && a.title);
  } catch {
    return [];
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const results = await Promise.all(FEEDS.map(fetchFeed));
    const seen = new Set<string>();
    const merged = results.flat().filter((a) => {
      if (seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });
    const cutoff = Date.now() - 7 * 86_400_000;
    const recent = merged
      .filter((a) => Date.parse(a.published_at) >= cutoff)
      .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
    return new Response(JSON.stringify({ count: recent.length, articles: recent }), {
      headers: { ...CORS, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), articles: [] }), {
      status: 500,
      headers: { ...CORS, "content-type": "application/json" },
    });
  }
});
