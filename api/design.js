// Reads a customer's grill photo(s) and/or description with AI and returns a tooth-by-tooth design for the 3D builder.
// Free option: set GEMINI_API_KEY (free key from aistudio.google.com). Optional paid option: ANTHROPIC_API_KEY.
const SYSTEM = `You read photos and descriptions of custom dental grillz and convert them into a design spec.
Return ONLY a JSON object, no prose, matching exactly:
{
 "top":    [8 values],   // upper front teeth, index 0..7 LEFT TO RIGHT AS SEEN IN THE PHOTO (viewer's left first): premolar, canine, lateral, central, central, lateral, canine, premolar
 "bottom": [8 values],   // lower front teeth, same order
 "gems": {"top":[8 values],"bottom":[8 values]},
 "metal": "k10" | "silver" | "unknown",
 "color": "yellow" | "white" | "rose",
 "stones": "si" | "vs" | "vvs" | "labvvs" | "moissanite" | null,
 "fangs": true | false,
 "custom": true | false,
 "customNotes": "short text",
 "summary": "one short sentence describing the piece",
 "confidence": 0.0-1.0
}
Values for "top"/"bottom": null (tooth not covered) | "polished" (smooth shiny metal) | "cut" (diamond-cut: grooved, faceted or patterned metal) | "open" (metal frame/outline with the natural tooth showing in the middle) | "iced" (tooth fully covered in set stones).
Values for "gems": null | "ruby" (red) | "sapphire" (blue) | "emerald" (green) | "pink" (pink/purple) | "opal" (white/iridescent/multicolour). Use a gem only for a distinct coloured stone set into a tooth, not for clear diamonds.
Rules:
- Grills usually cover 6 or 8 teeth per arch; map what you see to the 8 slots, centred. If 10 are visible ignore the outermost.
- A tooth that is mostly stones with a small metal edge is "iced". A colour-stone-heavy tooth is "iced" plus a gem.
- Gold-coloured metal: metal "k10", color "yellow"; pinkish metal: "k10","rose"; white/silver metal: if the text says silver use "silver", else "unknown" with color "white".
- "fangs": true only if the canines are elongated and pointed.
- Shapes we cannot model (letters, names, hearts, crosses, butterflies, snakes, logos, cut-outs, chains, unusual tooth shapes) => "custom": true and describe them in customNotes.
- Use the customer's text when it is more specific than the photo (e.g. stone grade, metal). If there is only text, build the design from the text.
- If something is not visible, choose the most likely value and lower "confidence".`;

const ALLOWED = { fin:[null,'polished','cut','open','iced'], gem:[null,'ruby','sapphire','emerald','pink','opal'] };
function clean(d){
  const arr=(a,ok)=>Array.from({length:8},(_,i)=>ok.includes(a&&a[i]!==undefined?a[i]:null)?(a?a[i]:null):null);
  return {
    top:arr(d.top,ALLOWED.fin), bottom:arr(d.bottom,ALLOWED.fin),
    gems:{top:arr(d.gems&&d.gems.top,ALLOWED.gem), bottom:arr(d.gems&&d.gems.bottom,ALLOWED.gem)},
    metal:['k10','silver','unknown'].includes(d.metal)?d.metal:'unknown',
    color:['yellow','white','rose'].includes(d.color)?d.color:'yellow',
    stones:['si','vs','vvs','labvvs','moissanite'].includes(d.stones)?d.stones:null,
    fangs:!!d.fangs, custom:!!d.custom,
    customNotes:String(d.customNotes||'').slice(0,300), summary:String(d.summary||'').slice(0,200),
    confidence:Math.max(0,Math.min(1,Number(d.confidence)||0))
  };
}


async function callGemini(key, model, text, images) {
  const parts = [...images.map(im => ({ inline_data: { mime_type: im.media_type, data: im.data } })), { text }];
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents: [{ role: 'user', parts }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } })
  });
  if (!r.ok) { const e = new Error('gemini ' + r.status); e.status = r.status; throw e; }
  const j = await r.json();
  return ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map(p => p.text || '').join('');
}
async function callClaude(key, model, text, images) {
  const content = [...images.map(im => ({ type: 'image', source: { type: 'base64', media_type: im.media_type, data: im.data } })), { type: 'text', text }];
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 1200, system: SYSTEM, messages: [{ role: 'user', content }] })
  });
  if (!r.ok) { const e = new Error('claude ' + r.status); e.status = r.status; throw e; }
  const j = await r.json();
  return (j.content || []).map(c => c.text || '').join('');
}
async function readDesign(body, env) {
  const text = String(body.text || '').slice(0, 2000);
  const images = (Array.isArray(body.images) ? body.images : []).slice(0, 3)
    .filter(im => im && /^image\/(jpeg|png|webp)$/.test(im.media_type) && typeof im.data === 'string' && im.data.length < 2000000);
  if (!text && !images.length) return { status: 400, json: { error: 'Send text or a photo' } };
  const prompt = (images.length ? 'Reference photo(s) of the grill the customer wants are attached. ' : '') +
    (text ? `Customer description: """${text}"""` : 'No description was given.') + '\nReturn the JSON design.';
  let out;
  if (env.GEMINI_API_KEY) {
    const models = env.GEMINI_MODEL ? [env.GEMINI_MODEL] : ['gemini-flash-latest', 'gemini-2.5-flash'];
    for (const m of models) { try { out = await callGemini(env.GEMINI_API_KEY, m, prompt, images); break; } catch (e) { if (e.status === 429) return { status: 429, json: { error: 'busy' } }; } }
  } else if (env.ANTHROPIC_API_KEY) {
    try { out = await callClaude(env.ANTHROPIC_API_KEY, env.CLAUDE_MODEL || 'claude-sonnet-5-5', prompt, images); } catch (e) {}
  } else return { status: 503, json: { error: 'AI not configured' } };
  if (!out) return { status: 502, json: { error: 'AI request failed' } };
  const m = out.match(/\{[\s\S]*\}/);
  if (!m) return { status: 502, json: { error: 'No design returned' } };
  try { return { status: 200, json: clean(JSON.parse(m[0])) }; } catch (e) { return { status: 502, json: { error: 'Bad design' } }; }
}

// Vercel: api/design.js  (env vars in Vercel > Settings > Environment Variables)
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  try { const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); const r = await readDesign(body, process.env); res.status(r.status).json(r.json); }
  catch (e) { res.status(500).json({ error: 'Could not read the design' }); }
};
module.exports.readDesign = readDesign;
