// ✅ DEPENDANCES
import express from 'express';
import fetch from 'node-fetch';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ✅ CONSTANTES SPOTIFY (⚠️ stocke-les en variables d'env en prod)
const CLIENT_ID = 'd1602b409bf54134b521955ac62b08e6';
const CLIENT_SECRET = 'c12f56e3c9a543b58b92455ede5f58d8';
const REFRESH_TOKEN = 'AQD1B6wv-rXieDV6vkH_I-qaF_Arjh_rSJa8UUePuMN0iZbw-lQ24P40Bk44oxlPMukM_5_b0F_AjN0Nm4bxJEuYlEOOMyrDN2Ekc-B14hV0aD4qbm1MO_hRc4hcez6GcrU';

const app = express();
const port = process.env.PORT || 3000;

// 📁 Chemin absolu
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const firmwareDir = path.join(__dirname, 'firmware');

// 🧠 ÉTAT EN MÉMOIRE (détection de changement)
let lastTrackId = null;
let lastPayload = null;

// ✅ FONCTIONS SPOTIFY
async function getAccessToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: REFRESH_TOKEN
    })
  });

  const data = await response.json();
  return data.access_token;
}

async function getAppAccessToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ grant_type: 'client_credentials' })
  });

  const data = await response.json();
  return data.access_token;
}

// ✅ UTIL IMAGE → RGB565 (24×24)
function rgb888to565(r, g, b) {
  const r5 = (r >> 3) & 0x1F;
  const g6 = (g >> 2) & 0x3F;
  const b5 = (b >> 3) & 0x1F;
  return (r5 << 11) | (g6 << 5) | b5;
}

async function convertImageToRGB565Base64(url) {
  const response = await fetch(url);
  const buffer = await response.buffer();

  const { data, info } = await sharp(buffer)
    .resize(24, 24)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 3) throw new Error('L’image n’est pas en RGB');

  const outBuffer = Buffer.alloc(24 * 24 * 2);
  for (let i = 0; i < 24 * 24; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    const rgb565 = rgb888to565(r, g, b);
    outBuffer[i * 2] = (rgb565 >> 8) & 0xFF;
    outBuffer[i * 2 + 1] = rgb565 & 0xFF;
  }
  return outBuffer.toString('base64');
}

// ✅ ENDPOINT SPOTIFY — état courant + flag new_track
app.get('/nowplaying', async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    const nowPlayingResponse = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    res.set('Cache-Control', 'no-store');

    if (nowPlayingResponse.status === 204) {
      // Rien ne joue
      const payload = {
        playing: false,
        message: 'Rien en cours',
        new_track: false,
        track_id: null
      };
      lastPayload = payload;
      return res.json(payload);
    }

    const data = await nowPlayingResponse.json();
    const imageUrl = data?.item?.album?.images?.[0]?.url || null;
    const trackId = data?.item?.id || null;
    const isNew = trackId && trackId !== lastTrackId;

    // (Option) ne recalculer l'image que si nouvelle piste
    const imageRGB565Base64 = imageUrl ? await convertImageToRGB565Base64(imageUrl) : null;

    // Audio analysis (optionnel, ici on le fait à chaque appel)
    const analysisToken = await getAppAccessToken();
    const analysisUrl = trackId ? `https://api.spotify.com/v1/audio-analysis/${trackId}` : null;

    let segments = [];
    if (analysisUrl) {
      const analysisResponse = await fetch(analysisUrl, {
        headers: { 'Authorization': `Bearer ${analysisToken}` }
      });
      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json();
        if (Array.isArray(analysisData.segments)) {
          segments = analysisData.segments.map(s => ({
            start: s.start,
            duration: s.duration,
            loudness: s.loudness_max
          })).slice(0, 200);
        }
      }
    }

    const payload = {
      playing: true,
      new_track: !!isNew,                      // 👈 flag clair
      title: data?.item?.name || null,
      artist: (data?.item?.artists || []).map(a => a.name).join(', '),
      album: data?.item?.album?.name || null,
      image: imageUrl,
      image_rgb565: imageRGB565Base64,
      progress_ms: data?.progress_ms ?? null,
      duration_ms: data?.item?.duration_ms ?? null,
      track_id: trackId,
      segments
    };

    // Met à jour l'état *après* avoir construit la réponse
    if (isNew) lastTrackId = trackId;
    lastPayload = payload;

    res.json(payload);
  } catch (err) {
    console.error('💥 Erreur serveur:', err);
    res.status(500).send('Erreur serveur.');
  }
});

// ✅ Long‑polling: répond seulement quand la piste change (ou timeout 25s)
app.get('/wait-track-change', async (req, res) => {
  const since = req.query.since || null;
  const deadline = Date.now() + 25000; // 25 s max
  res.set('Cache-Control', 'no-store');

  try {
    while (Date.now() < deadline) {
      if (lastTrackId && lastTrackId !== since) {
        return res.json({ changed: true, track_id: lastTrackId });
      }
      await new Promise(r => setTimeout(r, 1000));
    }
    return res.status(204).end(); // pas de changement
  } catch (e) {
    console.error('💥 wait-track-change error:', e);
    return res.status(500).end();
  }
});

// ✅ ENDPOINTS MISE À JOUR OTA
app.get('/firmware/version.txt', (req, res) => {
  const info = JSON.parse(fs.readFileSync(path.join(firmwareDir, 'firmware.json')));
  res.set('Cache-Control', 'no-store');
  res.send(info.latest);
});

app.get('/firmware/latest.bin', (req, res) => {
  const info = JSON.parse(fs.readFileSync(path.join(firmwareDir, 'firmware.json')));
  const firmwarePath = path.join(firmwareDir, info.filename);
  res.set('Cache-Control', 'no-store');
  res.sendFile(firmwarePath);
});

// ✅ Page racine simple
app.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.send('🎧 API TTGO Spotify + OTA prête !');
});

// ✅ Lancement serveur
app.listen(port, () => {
  console.log(`🚀 Serveur TTGO Spotify + OTA sur http://localhost:${port}`);
});
