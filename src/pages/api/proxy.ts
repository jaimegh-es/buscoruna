import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const type = url.searchParams.get('type') || 'itranvias';
  
  let targetUrl = '';

  if (type === 'itranvias') {
    const func = url.searchParams.get('func');
    const dato = url.searchParams.get('dato');
    if (!func || !dato) {
      return new Response(JSON.stringify({ error: 'Missing parameters' }), { status: 400 });
    }
    targetUrl = `https://itranvias.com/queryitr_v3.php?func=${func}&dato=${dato}`;
  } else if (type === 'photon') {
    const q = url.searchParams.get('q');
    const lat = url.searchParams.get('lat') || '43.3623';
    const lon = url.searchParams.get('lon') || '-8.4115';
    const bbox = url.searchParams.get('bbox');
    const limit = url.searchParams.get('limit') || '5';
    
    if (!q) {
      return new Response(JSON.stringify({ error: 'Missing query' }), { status: 400 });
    }
    targetUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${lat}&lon=${lon}${bbox ? `&bbox=${bbox}` : ''}&limit=${limit}`;
  } else {
    return new Response(JSON.stringify({ error: 'Invalid proxy type' }), { status: 400 });
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://itranvias.com/',
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch from target' }), { status: 500 });
  }
};
