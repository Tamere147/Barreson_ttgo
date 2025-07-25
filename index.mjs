import express from 'express';
import fetch from 'node-fetch';
import sharp from 'sharp';

const CLIENT_ID = 'd1602b409bf54134b521955ac62b08e6';
const CLIENT_SECRET = 'c12f56e3c9a543b58b92455ede5f58d8';
const REFRESH_TOKEN = 'AQD1B6wv-rXieDV6vkH_I-qaF_Arjh_rSJa8UUePuMN0iZbw-lQ24P40Bk44oxlPMukM_5_b0F_AjN0Nm4bxJEuYlEOOMyrDN2Ekc-B14hV0aD4qbm1MO_hRc4hcez6GcrU';

const app = express();
const port = 3000;

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

    // ⚠️ IMPORTANT : MSB first pour ESP32 (big endian)
    outBuffer[i * 2] = (rgb565 >> 8) & 0xFF;      // MSB
    outBuffer[i * 2 + 1] = rgb565 & 0xFF;         // LSB
  }

  return outBuffer.toString('base64');
}


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

    const track = {
      playing: true,
      title: data.item.name,
      artist: data.item.artists.map(artist => artist.name).join(', '),
      album: data.item.album.name,
      image: imageUrl,
      image_rgb565: imageRGB565Base64,
      progress_ms: data.progress_ms,
      duration_ms: data.item.duration_ms
    };

    res.json(track);
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).send('Erreur serveur.');
  }
});

app.get('/', (req, res) => res.send('OK'));

app.listen(port, () => {
  console.log(`🎧 Serveur nowplaying en écoute sur http://localhost:${port}`);
});
