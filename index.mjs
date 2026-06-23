// ✅ DEPENDANCES
import express from 'express';
import fetch from 'node-fetch';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.PUBLIC_URL || 'https://crude-lucita-waytec-c0f85bfa.koyeb.app';
const CALLBACK_PATH = '/auth/callback';
const REDIRECT_URI = `${BASE_URL}${CALLBACK_PATH}`;
const SPOTIFY_SCOPE = 'user-read-currently-playing user-read-playback-state';

// ✅ CONSTANTES SPOTIFY (⚠️ mettre en variables d'env en prod)
const CLIENT_ID = 'd1602b409bf54134b521955ac62b08e6';
const CLIENT_SECRET = 'c12f56e3c9a543b58b92455ede5f58d8';
const REFRESH_TOKEN = 'AQD1B6wv-rXieDV6vkH_I-qaF_Arjh_rSJa8UUePuMN0iZbw-lQ24P40Bk44oxlPMukM_5_b0F_AjN0Nm4bxJEuYlEOOMyrDN2Ekc-B14hV0aD4qbm1MO_hRc4hcez6GcrU';

// 🔗 Appairages stockés sur disque
const pairingsPath = path.join(__dirname, 'pairings.json');
let pairings = {};
if (fs.existsSync(pairingsPath)) {
  try {
    pairings = JSON.parse(fs.readFileSync(pairingsPath, 'utf8'));
  } catch (err) {
    console.warn('⚠️ Impossible de charger pairings.json, réinitialisation.', err);
    pairings = {};
  }
}

function persistPairings() {
  try {
    fs.writeFileSync(pairingsPath, JSON.stringify(pairings, null, 2));
  } catch (err) {
    console.error('⚠️ Erreur écriture pairings.json:', err);
  }
}

function getRefreshTokenForDevice(deviceId = '') {
  const trimmed = (deviceId || '').trim();
  if (trimmed && pairings[trimmed] && pairings[trimmed].refresh_token) {
    return pairings[trimmed].refresh_token;
  }
  return REFRESH_TOKEN || null;
}

function deviceHasRefreshToken(deviceId = '') {
  const trimmed = (deviceId || '').trim();
  return !!(trimmed && pairings[trimmed] && pairings[trimmed].refresh_token);
}

function htmlSafe(value) {
  return String(value || '').replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}

const app = express();
const port = process.env.PORT || 3000;
const firmwareDir = path.join(__dirname, 'firmware');

// ✅ FONCTIONS SPOTIFY
async function getAccessToken(deviceId = '') {
  const refreshToken = getRefreshTokenForDevice(deviceId);
  if (!refreshToken) {
    const err = new Error('NO_REFRESH_TOKEN');
    err.code = 'NO_REFRESH_TOKEN';
    throw err;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const err = new Error(`TOKEN_REFRESH_FAIL_${response.status}`);
    err.code = 'TOKEN_REFRESH_FAIL';
    err.payload = data;
    throw err;
  }

  return data.access_token;
}

async function exchangeCodeForRefreshToken(code) {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI
    })
  });

  const data = await response.json();
  if (!response.ok || !data.refresh_token) {
    const err = new Error(`AUTH_CODE_EXCHANGE_FAIL_${response.status}`);
    err.payload = data;
    throw err;
  }

  return data.refresh_token;
}

function buildPairingUrl(deviceId = '') {
  const trimmed = (deviceId || '').trim();
  if (!trimmed) return `${BASE_URL}/pair`;
  return `${BASE_URL}/pair?deviceId=${encodeURIComponent(trimmed)}`;
}

function buildAuthorizeUrl(deviceId) {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SPOTIFY_SCOPE,
    state: deviceId
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function logPairing(deviceId, refreshToken) {
  pairings[deviceId] = {
    refresh_token: refreshToken,
    updatedAt: new Date().toISOString()
  };
  persistPairings();
  console.log(`🎧 Spotify lié à ${deviceId}`);
}

async function getAppAccessToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials'
    })
  });

  const data = await response.json();
  return data.access_token;
}

// ✅ Conversion image → RGB565 (24×24)
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

  if (info.channels !== 3) {
    throw new Error('L’image n’est pas en RGB');
  }

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

// 🔗 ENDPOINTS D'APPAIRAGE
app.get('/pair/status', (req, res) => {
  const deviceId = (req.query.deviceId || '').trim();
  if (!deviceId) {
    return res.status(400).json({ linked: false, reason: 'missing_device' });
  }
  res.json({ linked: deviceHasRefreshToken(deviceId), deviceId });
});

app.get('/pair', (req, res) => {
  const deviceId = (req.query.deviceId || '').trim();
  const displayId = deviceId.length ? deviceId : 'inconnu';
  const safeId = htmlSafe(displayId);
  const alreadyLinked = deviceHasRefreshToken(deviceId);
  const body = `
    <!doctype html>
    <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <title>Associer le module TTGO à Spotify</title>
      <style>
        body { font-family: Arial, sans-serif; background:#0b1726; color:#f3f5f9; padding:32px; line-height:1.5; }
        main { max-width: 520px; margin: 0 auto; padding: 24px; background:#111c2d; border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,0.35); }
        h1 { margin-top:0; }
        .badge { display:inline-block; padding:6px 10px; border-radius:6px; background:#1db954; color:#0b1726; font-weight:700; letter-spacing:0.5px; }
        .card { margin-top:18px; padding:14px; border:1px solid #1f2a3a; border-radius:10px; }
        button { background:#1db954; border:none; color:#0b1726; padding:12px 18px; font-weight:700; border-radius:10px; cursor:pointer; font-size:16px; }
        button:hover { transform: translateY(-1px); box-shadow:0 8px 20px rgba(29,185,84,0.3); }
        .muted { color:#9fb0c6; }
      </style>
    </head>
    <body>
      <main>
        <div class="badge">Spotify</div>
        <h1>Connecter le module</h1>
        <p>Module détecté : <strong>${safeId}</strong></p>
        <div class="card">
          <p class="muted">Une fois connecté, le module utilisera votre compte Spotify pour afficher le morceau en cours.</p>
          ${alreadyLinked ? '<p>Ce module est déjà associé.</p>' : '<p>Autorisez l\'application pour terminer l\'appairage.</p>'}
        </div>
        <form action="/auth/spotify" method="get">
          <input type="hidden" name="deviceId" value="${htmlSafe(deviceId)}">
          <button type="submit">${alreadyLinked ? 'Relier à nouveau' : 'Associer à Spotify'}</button>
        </form>
      </main>
    </body>
    </html>
  `;
  res.send(body);
});

app.get('/auth/spotify', (req, res) => {
  const deviceId = (req.query.deviceId || '').trim();
  if (!deviceId) {
    return res.status(400).send('deviceId manquant');
  }
  res.redirect(buildAuthorizeUrl(deviceId));
});

app.get(CALLBACK_PATH, async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) {
    return res.status(400).send('Paramètres manquants.');
  }

  try {
    const refreshToken = await exchangeCodeForRefreshToken(code);
    logPairing(state, refreshToken);
    const backUrl = buildPairingUrl(state);
    res.send(`<html><body><h2>✅ Appairage réussi pour ${htmlSafe(state)}</h2><p>Vous pouvez fermer cette page. <a href="${backUrl}">Retour</a></p></body></html>`);
  } catch (err) {
    console.error('⚠️ Erreur callback Spotify:', err);
    res.status(500).send('Impossible de finaliser la liaison Spotify.');
  }
});

// ✅ ENDPOINT SPOTIFY
app.get('/nowplaying', async (req, res) => {
  try {
    const deviceId = (req.query.deviceId || '').trim();

    if (!deviceHasRefreshToken(deviceId) && !REFRESH_TOKEN) {
      return res.status(428).json({ playing: false, message: 'Appairage Spotify requis', pair_url: buildPairingUrl(deviceId), deviceId });
    }

    const accessToken = await getAccessToken(deviceId);

    // Récupère la piste en cours
    const nowPlayingResponse = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (nowPlayingResponse.status === 204) {
      return res.json({ playing: false, message: 'Rien en cours' });
    }

    const data = await nowPlayingResponse.json();
    const imageUrl = data.item.album.images[0]?.url || null;
    const imageRGB565Base64 = imageUrl ? await convertImageToRGB565Base64(imageUrl) : null;

    const trackId = data.item.id;
    console.log("🎵 Track ID:", trackId);

    // 🔹 Récupère la prochaine piste dans la queue
    const queueResponse = await fetch('https://api.spotify.com/v1/me/player/queue', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    let nextTrackId = null;
    let nextTrackTitle = null;
    if (queueResponse.ok) {
      const queueData = await queueResponse.json();
      if (queueData.queue && queueData.queue.length > 0) {
        nextTrackId = queueData.queue[0].id;
        nextTrackTitle = queueData.queue[0].name;
      }
    }

    // 🔹 Analyse audio de la piste actuelle
    const analysisToken = await getAppAccessToken();
    const analysisUrl = `https://api.spotify.com/v1/audio-analysis/${trackId}`;
    const analysisResponse = await fetch(analysisUrl, {
      headers: { 'Authorization': `Bearer ${analysisToken}` }
    });

    let segments = [];
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

    const track = {
      playing: true,
      title: data.item.name,
      artist: data.item.artists.map(a => a.name).join(', '),
      album: data.item.album.name,
      image: imageUrl,
      image_rgb565: imageRGB565Base64,
      progress_ms: data.progress_ms,
      duration_ms: data.item.duration_ms,
      track_id: trackId,
      next_track_id: nextTrackId,        // 👈 ID de la prochaine piste
      next_track_title: nextTrackTitle,  // 👈 Titre de la prochaine piste
      segments
    };

    res.json(track);

  } catch (err) {
    const deviceId = (req.query.deviceId || '').trim();
    if (err.code === 'NO_REFRESH_TOKEN') {
      return res.status(428).json({ playing: false, message: 'Appairage Spotify requis', pair_url: buildPairingUrl(deviceId), deviceId });
    }
    if (err.code === 'TOKEN_REFRESH_FAIL') {
      if (deviceId) {
        delete pairings[deviceId];
        persistPairings();
      }
      return res.status(401).json({
        playing: false,
        message: 'Token Spotify expiré, réassociez le module',
        pair_url: buildPairingUrl(deviceId),
        deviceId
      });
    }
    console.error('💥 Erreur serveur:', err);
    res.status(500).send('Erreur serveur.');
  }
});

// ✅ ENDPOINT MISE À JOUR OTA
app.get('/firmware/version.txt', (req, res) => {
  const info = JSON.parse(fs.readFileSync(path.join(firmwareDir, 'firmware.json')));
  res.send(info.latest);
});

app.get('/firmware/latest.bin', (req, res) => {
  const info = JSON.parse(fs.readFileSync(path.join(firmwareDir, 'firmware.json')));
  const firmwarePath = path.join(firmwareDir, info.filename);
  res.sendFile(firmwarePath);
});

// ✅ Page racine simple
app.get('/', (req, res) => {
  res.send('🎧 API TTGO Spotify + OTA prête !');
});

// ✅ Lancement serveur
app.listen(port, () => {
  console.log(`🚀 Serveur TTGO Spotify + OTA sur http://localhost:${port}`);
});
