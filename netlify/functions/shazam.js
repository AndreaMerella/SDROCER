// Server-side proxy — keeps the RapidAPI key out of client JS
export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await req.text();
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to read request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let response;
  try {
    response = await fetch('https://shazam.p.rapidapi.com/songs/v2/detect', {
      method: 'POST',
      headers: {
        'content-type': 'text/plain',
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'shazam.p.rapidapi.com'
      },
      body
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: `Network error: ${err.message}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Forward non-OK status codes so the client can handle them meaningfully
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return new Response(JSON.stringify({ error: `Upstream ${response.status}`, detail: text.slice(0, 200) }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON from Shazam API' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
