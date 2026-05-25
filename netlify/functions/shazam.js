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

  const body = await req.text();

  const response = await fetch('https://shazam.p.rapidapi.com/songs/v2/detect', {
    method: 'POST',
    headers: {
      'content-type': 'text/plain',
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'shazam.p.rapidapi.com'
    },
    body
  });

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const config = { path: '/api/shazam' };
