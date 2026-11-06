// Vercel serverless mirror of POST /api/analyze-photo (see server.js).
// Local dev uses server.js; Vercel cannot run server.js, so without this
// file /api/analyze-photo 404s on Vercel and the UI silently falls back
// to demo mode. Keys come from env (never shipped to the browser), with
// rotation like api/customer-care.js: first working key wins, on
// 401/403/429/5xx the request rotates to the next key.
import { getPriceTablePromptSummary } from '../pricingTable.js';

const rateLimits = new Map(); // ip -> timestamps (per serverless instance)
function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimits.get(ip) || [];
  while (record.length && record[0] < now - 60_000) record.shift();
  if (record.length >= 5) return false;
  record.push(now);
  rateLimits.set(ip, record);
  return true;
}

// Same demo fallback as server.js getDemoAiResult() / photoDiagnosis.js.
function getDemoAiResult(note) {
  const n = (note || '').toLowerCase();
  if (n.includes('electric') || n.includes('wire') || n.includes('spark') || n.includes('switch')) {
    return { problem_found: true, issue: 'Faulty electrical switchboard with exposed wiring', service_category: 'electrician', urgency: 'emergency', price_min: 800, price_max: 2500, likely_materials: ['MCB breaker', 'Electrical tape', 'Wire connectors'], estimated_duration_minutes: 45, safety_warning: 'Do NOT touch exposed wires. Turn off the main breaker immediately.', confidence: 'high', follow_up_question: null };
  }
  if (n.includes('paint') || n.includes('damp') || n.includes('wall') || n.includes('peel')) {
    return { problem_found: true, issue: 'Damp wall with paint peeling and possible seepage', service_category: 'painter', urgency: 'medium', price_min: 1500, price_max: 5000, likely_materials: ['Primer', 'Waterproof putty', 'Emulsion paint'], estimated_duration_minutes: 180, safety_warning: null, confidence: 'high', follow_up_question: null };
  }
  if (n.includes('carpenter') || n.includes('wood') || n.includes('door') || n.includes('furniture')) {
    return { problem_found: true, issue: 'Damaged wooden door hinge and frame repair needed', service_category: 'carpenter', urgency: 'low', price_min: 500, price_max: 2000, likely_materials: ['Door hinges', 'Wood screws', 'Wood filler'], estimated_duration_minutes: 60, safety_warning: null, confidence: 'high', follow_up_question: null };
  }
  return { problem_found: true, issue: 'Leaking kitchen tap with worn-out washer', service_category: 'plumber', urgency: 'medium', price_min: 300, price_max: 800, likely_materials: ['Tap washer', 'Teflon tape', 'Adjustable wrench'], estimated_duration_minutes: 30, safety_warning: null, confidence: 'high', follow_up_question: null };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(String(ip).split(',')[0].trim())) {
    res.status(429).json({ error: 'Rate limit exceeded. Max 5 requests per minute.' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { image, note } = body;
  if (!image) { res.status(400).json({ error: 'image field (base64 data URL) is required' }); return; }

  const keys = [
    ...(process.env.GEMINI_API_KEYS || '').split(/[,\n\r]+/),
    ...(process.env.AI_API_KEYS || '').split(/[,\n\r]+/),
    process.env.GEMINI_API_KEY || '',
    process.env.AI_API_KEY || ''
  ].map((k) => String(k || '').trim()).filter(Boolean);

  // Demo fallback if no key or demo mode (same behaviour as server.js).
  if (process.env.DEMO_MODE === 'true' || !keys.length) {
    const demoResult = getDemoAiResult(note);
    res.status(200).json({ success: true, ai_source: 'demo', detail: process.env.DEMO_MODE === 'true' ? 'DEMO_MODE=true' : 'no GEMINI_API_KEY(S) set on server', diagnosis: demoResult, ...demoResult });
    return;
  }

  const base64Match = String(image).match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
  if (!base64Match) { res.status(400).json({ error: 'Invalid image format. Expected data:image/(jpeg|png|webp);base64,...' }); return; }
  const mimeType = `image/${base64Match[1]}`;
  const base64Data = base64Match[2];

  const systemPrompt = `You are an expert home-services diagnostic assistant for LocalKaam, an Indian blue-collar services marketplace in Mumbai.

PRICING TABLE (use ONLY these ranges for estimates):
${getPriceTablePromptSummary()}

Analyze the photo and any note the customer provides. Reply with ONLY valid JSON (no markdown fences):
{
  "problem_found": true/false,
  "issue": "short plain-language description",
  "service_category": "plumber|electrician|painter|cleaner|carpenter|appliance_repair",
  "urgency": "low|medium|high|emergency",
  "price_min": number_in_INR,
  "price_max": number_in_INR,
  "likely_materials": ["item1", "item2"],
  "estimated_duration_minutes": number,
  "safety_warning": "string or null",
  "confidence": "low|medium|high",
  "follow_up_question": "string or null"
}

Rules:
- Set problem_found=false and ask a follow_up_question if the photo is unclear or not a household problem.
- Set urgency=emergency and add safety_warning for hazards (exposed wires, sparks, water near electricity, gas leaks).
- Prices MUST come from the pricing table above.`;

  const geminiBody = {
    contents: [{ parts: [
      { text: systemPrompt + (note ? `\n\nCustomer note: "${note}"` : '\n\nNo additional note provided.') },
      { inline_data: { mime_type: mimeType, data: base64Data } }
    ] }],
    generationConfig: { response_mime_type: 'application/json', temperature: 0.3 }
  };

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  let lastError = '';
  for (const key of keys) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      let aiRes;
      try {
        aiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiBody),
          signal: controller.signal
        });
      } finally { clearTimeout(timeout); }

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        let text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        text = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
        try {
          const parsed = JSON.parse(text);
          res.status(200).json({ success: true, ai_source: 'live', model, diagnosis: parsed, ...parsed });
          return;
        } catch {
          break; // Unparseable AI reply — demo fallback below.
        }
      }
      lastError = `Gemini API error: ${aiRes.status}`;
      console.error(lastError);
      if (!(aiRes.status === 401 || aiRes.status === 403 || aiRes.status === 429 || aiRes.status >= 500)) break;
    } catch (err) {
      lastError = err?.message || 'Request failed';
    }
  }
  const fallback = getDemoAiResult(note);
  res.status(200).json({ success: true, ai_source: 'demo', detail: lastError, diagnosis: fallback, ...fallback });
}
