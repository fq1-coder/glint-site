GLINT GRILLZ SITE — HOW TO GO LIVE

1. Fill in your details
   Open index.html in any text editor and search for "CONTACT".
   Replace the placeholders with your real details:
     instagram, tiktok, whatsapp (digits only, with country code), phone, email.
   Prices are in the "PRICES" table just above it.

2. Put it online (free, about 2 minutes)
   Go to https://app.netlify.com/drop and drag this whole folder onto the page.
   You'll get a live link right away, and you can connect your own domain later.

3. Optional: receive requests by email automatically
   Make a free form at https://formspree.io and copy its URL
   (it looks like https://formspree.io/f/abcd1234).
   Paste it into CONTACT.formEndpoint in index.html and upload the folder again.
   Requests and reference photos then also land in your inbox.

Keep the "work" folder next to index.html. It holds your videos and photos.

AUTOMATIC PHOTO READING (Describe it section)
   When a customer uploads a grill photo or describes one, the site asks Claude (AI) to read it
   tooth by tooth and builds the 3D preview from that. This needs a small server piece (api/design.js),
   so it works when the site runs on Vercel, not on GitHub Pages.
   1. On vercel.com: Add New > Project > Import your GitHub repo "glint-site" > Deploy.
   2. Get an API key at console.anthropic.com (API Keys).
   3. In Vercel: Project > Settings > Environment Variables > add ANTHROPIC_API_KEY = your key.
   4. Deployments > Redeploy. Your site (with camera try-on and photo reading) is at the vercel.app link.
   Each photo read is one AI request, typically a few cents. Without the key, customers simply pick the options themselves.
