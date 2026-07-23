export async function fetchReelContext(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MakeReelsReal/1.0)",
      "Accept-Language": "en"
    },
    redirect: "follow"
  });
  if (!response.ok) throw new Error(`Could not open Reel (${response.status})`);
  const html = await response.text();
  const readMeta = (property: string) => {
    const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, "i"))
      ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"));
    return match?.[1]?.replaceAll("&amp;", "&").replaceAll("&#39;", "'") ?? "";
  };
  return {
    title: readMeta("og:title"),
    description: readMeta("og:description"),
    canonicalUrl: readMeta("og:url") || url
  };
}
