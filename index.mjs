// ✅ DEPENDANCES
import express from 'express';
import fetch from 'node-fetch';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ✅ CONSTANTES SPOTIFY
const CLIENT_ID = 'd1602b409bf54134b521955ac62b08e6';
const CLIENT_SECRET = 'c12f56e3c9a543b58b92455ede5f58d8';
const REFRESH_TOKEN = 'AQD1B6wv-rXieDV6vkH_I-qaF_Arjh_rSJa8UUePuMN0iZbw-lQ24P40Bk44oxlPMukM_5_b0F_AjN0Nm4bxJEuYlEOOMyrDN2Ekc-B14hV0aD4qbm1MO_hRc4hcez6GcrU';

const app = express();
const port = process.env.PORT || 3000;

// 📁 Chemin absolu
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const firmwareDir = path.join(__dirname, 'firmware');

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
    body: new URLSearchParams({
      grant_type: 'client_credentials'
    })
  });

  const data = await response.json();
  return data.access_token;
}

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

// ✅ ENDPOINT SPOTIFY

app.get('/nowplaying', async (req, res) => {
  try {
    const accessToken = await getAccessToken();

    const nowPlayingResponse = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (nowPlayingResponse.status === 204) {
      return res.json({ playing: false, message: 'Rien en cours' });
    }

    const data = await nowPlayingResponse.json();
    const imageUrl = data.item.album.images[0]?.url;
    const imageRGB565Base64 = imageUrl
      ? await convertImageToRGB565Base64(imageUrl)
      : null;

    const trackId = data.item.id;
    const analysisToken = await getAppAccessToken(); // ✅ Token sans compte
    const analysisUrl = `https://api.spotify.com/v1/audio-analysis/${trackId}`;

    const analysisResponse = await fetch(analysisUrl, {
      headers: { 'Authorization': `Bearer ${analysisToken}` }
    });


    let segments = [];

    if (!analysisResponse.ok) {
      console.error(`Erreur API audio-analysis : ${analysisResponse.status}`);
    } else {
      const analysisData = await analysisResponse.json();

      if (!analysisData.segments || !Array.isArray(analysisData.segments)) {
        console.error("Champ segments manquant ou invalide dans audio-analysis");
      } else {
        segments = analysisData.segments.map(s => ({
          start: s.start,
          duration: s.duration,
          loudness: s.loudness_max
        })).slice(0, 200); // Limite mémoire
        console.log(`✅ ${segments.length} segments récupérés`);
      }
    }

    const track = {
      playing: true,
      title: data.item.name,
      artist: data.item.artists.map(artist => artist.name).join(', '),
      album: data.item.album.name,
      image: imageUrl,
      image_rgb565: imageRGB565Base64,
      progress_ms: data.progress_ms,
      duration_ms: data.item.duration_ms,
      track_id: trackId,
      segments
    };

    res.json(track);

  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).send('Erreur serveur.');
  }
});


// ✅ ENDPOINT MISE À JOUR OTA

// Sert version.txt
app.get('/firmware/version.txt', (req, res) => {
  const info = JSON.parse(fs.readFileSync(path.join(firmwareDir, 'firmware.json')));
  res.send(info.latest);
});

// Sert automatiquement le dernier firmware
app.get('/firmware/latest.bin', (req, res) => {
  const info = JSON.parse(fs.readFileSync(path.join(firmwareDir, 'firmware.json')));
  const firmwarePath = path.join(firmwareDir, info.filename);
  res.sendFile(firmwarePath);
})

// ✅ Page racine simple
app.get('/', (req, res) => {
  res.send('🎧 API TTGO Spotify + OTA prête !');
});

// ✅ Lancement serveur
app.listen(port, () => {
  console.log(`🚀 Serveur TTGO Spotify + OTA sur http://localhost:${port}`);
});
