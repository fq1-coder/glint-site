// Vercel serverless function: reads a customer's grill photo(s) and/or description with Claude
// and returns a tooth-by-tooth design the 3D builder can render.
// Setup: in Vercel > Project > Settings > Environment Variables add ANTHROPIC_API_KEY, then redeploy.
const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';

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

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({error:'POST only'}); return; }
  if (!process.env.ANTHROPIC_API_KEY) { res.status(503).json({error:'AI not configured'}); return; }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const text = String(body.text || '').slice(0, 2000);
    const images = (Array.isArray(body.images) ? body.images : []).slice(0, 3)
      .filter(im => im && /^image\/(jpeg|png|webp)$/.test(im.media_type) && typeof im.data === 'string' && im.data.length < 2_000_000);
    if (!text && !images.length) { res.status(400).json({error:'Send text or a photo'}); return; }
    const content = [
      ...images.map(im => ({ type:'image', source:{ type:'base64', media_type:im.media_type, data:im.data } })),
      { type:'text', text: (images.length ? 'Reference photo(s) of the grill the customer wants are attached. ' : '') +
        (text ? `Customer description: """${text}"""` : 'No description was given.') + '\nReturn the JSON design.' }
    ];
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{ 'x-api-key':process.env.ANTHROPIC_API_KEY, 'anthropic-version':'2023-06-01', 'content-type':'application/json' },
      body: JSON.stringify({ model:MODEL, max_tokens:1200, system:SYSTEM, messages:[{ role:'user', content }] })
    });
    if (!r.ok) { res.status(502).json({error:'AI request failed', status:r.status}); return; }
    const j = await r.json();
    const out = (j.content || []).map(c => c.text || '').join('');
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) { res.status(502).json({error:'No design returned'}); return; }
    res.status(200).json(clean(JSON.parse(m[0])));
  } catch (e) {
    res.status(500).json({ error:'Could not read the design' });
  }
};
module.exports.clean = clean;
