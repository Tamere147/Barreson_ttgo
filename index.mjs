import express from 'express';
import fetch from 'node-fetch';

const CLIENT_ID = 'd1602b409bf54134b521955ac62b08e6';
const CLIENT_SECRET = 'c12f56e3c9a543b58b92455ede5f58d8';
const REFRESH_TOKEN = 'AQD1B6wv-rXieDV6vkH_I-qaF_Arjh_rSJa8UUePuMN0iZbw-lQ24P40Bk44oxlPMukM_5_b0F_AjN0Nm4bxJEuYlEOOMyrDN2Ekc-B14hV0aD4qbm1MO_hRc4hcez6GcrU';

const app = express();
const port = 3000;

// Fonction pour obtenir un nouvel access token
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

app.get('/nowplaying', async (req, res) => {
  try {
    const accessToken = await getAccessToken();

    const nowPlayingResponse = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (nowPlayingResponse.status === 204) {
      return res.json({ playing: false, message: 'Rien en cours' });
    }

    const data = await nowPlayingResponse.json();

    const track = {
      playing: true,
      title: data.item.name,
      artist: data.item.artists.map(artist => artist.name).join(', '),
      album: data.item.album.name,
      image: data.item.album.images[0]?.url,
      progress_ms: data.progress_ms,
      duration_ms: data.item.duration_ms
    };

    res.json(track);
  } catch (err) {
    console.error('Erreur:', err);
    res.status(500).send('Erreur lors de la récupération de la lecture en cours.');
  }
});
app.get('/', (req, res) => {
  res.send('OK');
});

app.listen(port, () => {
  console.log(`🎧 Serveur nowplaying en écoute sur http://localhost:${port}/nowplaying`);
});
