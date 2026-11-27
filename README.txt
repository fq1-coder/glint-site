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

AUTOMATIC PHOTO READING (Describe it section) - FREE SETUP
   When a customer uploads a grill photo or describes one, AI reads it tooth by tooth and the
   3D preview is built from that. This runs in a small server piece, so the site must be hosted
   on Cloudflare Pages (free, business use allowed) instead of GitHub Pages.

   A. Get a free Gemini key (no card needed)
      1. Go to aistudio.google.com and sign in with a Google account.
      2. Click "Get API key" > "Create API key". Copy it.

   B. Host on Cloudflare Pages (free)
      1. Go to dash.cloudflare.com and sign up (free).
      2. Workers & Pages > Create > Pages > Connect to Git > pick "glint-site".
      3. Build settings: Framework preset "None", build command empty, output directory "/". Save and Deploy.
      4. Project > Settings > Variables and Secrets > Add: name GEMINI_API_KEY, value = your key (type Secret).
      5. Deployments > retry the latest deployment so it picks up the key.
      Your site is at https://glint-site.pages.dev (live camera try-on + photo reading).
      Every change pushed to GitHub redeploys automatically.

   Notes
   - Gemini's free tier has daily limits; a small shop won't usually hit them. If it does, customers
     simply pick the options themselves until the next day.
   - On Gemini's free tier, Google may use what is sent (the customer photos/text) to improve its products.
     Their paid tier doesn't. Optional: set ANTHROPIC_API_KEY instead to use Claude (paid, a few cents per photo).
   - Vercel also works (api/design.js), but Vercel's free plan is for non-commercial use.

PRICES AND THE WEBSITE FEE
   The shop's own prices are in the PRICES table near the top of the script in index.html.
   PRICES.fee (0.10 = 10%) is added on top of every price and built into what customers see.
   To work out the shop's share of an order: customer total / 1.10. Your 10% is the rest.
