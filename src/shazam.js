// Shazam client — calls our server-side proxy, parses full metadata

export async function identify(base64Audio) {
  const response = await fetch('/api/shazam', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: base64Audio
  });

  if (!response.ok) {
    const { status } = response;
    if (status === 429) throw new Error('RATE LIMIT — WAIT A MOMENT AND TRY AGAIN');
    if (status === 403) throw new Error('API QUOTA EXCEEDED — CHECK RAPIDAPI PLAN');
    if (status === 404) throw new Error('API ENDPOINT UNAVAILABLE — CHECK RAPIDAPI');
    if (status === 500) throw new Error('API KEY NOT CONFIGURED ON SERVER');
    if (status === 502) throw new Error('SHAZAM UNREACHABLE — CHECK CONNECTION');
    throw new Error(`UPSTREAM ERROR ${status}`);
  }

  const data = await response.json();
  if (!data.track) return null;

  return parseTrack(data.track);
}

function parseTrack(track) {
  const meta = {};

  // Pull structured metadata from sections
  for (const section of track.sections || []) {
    if (section.type === 'SONG') {
      for (const item of section.metadata || []) {
        meta[item.title.toLowerCase()] = item.text;
      }
    }
    if (section.type === 'BEATSPERMINUTE') {
      meta.bpm = section.beatsperminute;
    }
  }

  return {
    title: track.title,
    artist: track.subtitle,
    artwork: track.images?.coverarthq || track.images?.coverart || null,
    label: meta.label || null,
    year: meta.released || null,
    genre: meta.genre || null,
    bpm: meta.bpm || null,
    shazamKey: track.key,
    shazamUrl: track.url || null
  };
}
