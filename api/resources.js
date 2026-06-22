export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  // Gemini not yet configured — returns null until API key is added
  if (!process.env.GEMINI_API_KEY) {
    return res.status(200).json({ resources: null });
  }

  try {
    // ── Activate this block when your Gemini API key is ready ──────────────
    // const response = await fetch(
    //   `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${process.env.GEMINI_API_KEY}`,
    //   {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       contents: [{
    //         parts: [{
    //           text: `Find 2 YouTube video links and 1 free worksheet for this math topic: ${topic}.
    //                  Return JSON: { videos: [{title, url}], worksheet: {title, url} }`
    //         }]
    //       }]
    //     }),
    //   }
    // );
    // const data = await response.json();
    // return res.status(200).json({ resources: data });
    // ────────────────────────────────────────────────────────────────────────

    return res.status(200).json({ resources: null });
  } catch (error) {
    console.error('Resources handler error:', error);
    return res.status(500).json({ error: 'Failed to fetch resources' });
  }
}
