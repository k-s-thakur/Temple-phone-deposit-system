// Vercel Serverless Function Proxy (PRD Section 10.4)
// Proxies API calls from Vercel frontend to Google Apps Script Web App
// Resolves CORS preflights and follows Apps Script 302 redirects server-to-server.

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-apps-script-url');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetUrl =
    process.env.GOOGLE_APPS_SCRIPT_URL ||
    req.headers['x-apps-script-url'] ||
    (req.query && req.query.url);

  if (!targetUrl) {
    return res.status(400).json({
      success: false,
      error: 'Missing Google Apps Script URL. Provide GOOGLE_APPS_SCRIPT_URL env var or x-apps-script-url header.'
    });
  }

  try {
    if (req.method === 'GET') {
      const response = await fetch(`${targetUrl}?action=ping`, {
        method: 'GET',
        redirect: 'follow'
      });
      const data = await response.json();
      return res.status(200).json(data);
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Error communicating with Google Apps Script'
    });
  }
}
