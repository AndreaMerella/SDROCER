// Discogs API — enriches Shazam results with vinyl-specific metadata
// No auth needed for search (25 req/min unauthenticated)

const BASE = 'https://api.discogs.com';
const UA = 'SDROCER/2.0 +https://github.com/AndreaMerella/SDROCER';

export async function search(query) {
  const url = `${BASE}/database/search?q=${encodeURIComponent(query)}&per_page=8&type=release`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return [];

  const data = await res.json();
  return (data.results || []).map(r => ({
    discogsId: r.id,
    title: r.title,
    label: r.label?.[0] || null,
    year: r.year || null,
    genre: r.genre?.[0] || null,
    style: r.style?.[0] || null,
    artwork: r.cover_image || r.thumb || null,
    country: r.country || null,
    format: r.format?.[0] || null,
    discogsUrl: `https://www.discogs.com${r.uri}`
  }));
}

export async function enrich(title, artist) {
  const results = await search(`${artist} ${title}`);
  return results[0] || null;
}
