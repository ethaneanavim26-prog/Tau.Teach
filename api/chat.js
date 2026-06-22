const CLAUDE_SYSTEM_PROMPT = `You are TauTeach AI, a world-class math tutor. Your job is to explain math clearly, step-by-step, adapting to the student.

Formatting rules you must always follow:
- Use $...$ for ALL inline math. Example: The slope is $m = \\frac{rise}{run}$.
- Use $$...$$ on its own line for display math. Example: $$\\int_a^b f(x)\\,dx = F(b) - F(a)$$
- Use **bold** for key terms and step labels like **Step 1:**
- Show every step. Never skip algebra.
- Be encouraging but concise.`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: CLAUDE_SYSTEM_PROMPT,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'Error from Claude API',
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Chat handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
