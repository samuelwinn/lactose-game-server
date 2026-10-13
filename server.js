const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/game', async (req, res) => {
  const id = String(req.query.id || '');
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(id)) {
    return res.status(400).send('Invalid or missing Google Drive file ID.');
  }

  try {
    const upstream = await fetch(`https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`, {
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!upstream.ok) {
      return res.status(502).send(`Google Drive returned HTTP ${upstream.status}. Make sure the file is shared with anyone who has the link.`);
    }

    const contentType = (upstream.headers.get('content-type') || '').toLowerCase();
    const body = await upstream.text();
    const looksLikeHtml = /<!doctype\s+html|<html[\s>]/i.test(body);
    const looksLikeDriveError = /google drive - quota|you need access|request access|sign in/i.test(body.slice(0, 5000));

    if (looksLikeDriveError || (!looksLikeHtml && !contentType.includes('text/html'))) {
      return res.status(422).send('This Drive file did not return an accessible HTML game. Check its sharing settings and confirm the file is an HTML document.');
    }

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'public, max-age=60');
    return res.send(body);
  } catch (error) {
    console.error(error);
    return res.status(502).send('Could not retrieve the Google Drive file.');
  }
});

app.get('/', (_req, res) => res.type('text').send('Lactose game proxy is running. Test /health.'));

app.listen(PORT, '0.0.0.0', () => console.log(`Lactose proxy listening on ${PORT}`));
