# Watch Party

A real-time watch-party web app with room codes, synchronized playback, chat, a video queue, polls, and host controls.

## Website

The frontend is published on GitHub Pages:

https://anujj3431.github.io/Watch-Party-WebApp/

## Important: deploy the backend too

GitHub Pages only hosts static files. Room creation, joining by room code, chat, and synchronization require the Node.js/WebSocket backend.

This repository includes `render.yaml` for deploying that backend on Render:

1. Sign in to [Render](https://render.com/).
2. Choose **New → Blueprint** and connect this repository.
3. Let Render read `render.yaml` and deploy the `watch-party-backend` web service.
4. Copy the service's public `https://....onrender.com` URL.
5. In this repository, edit `public/config.js` and set the URL:
   ```js
   window.WATCH_PARTY_BACKEND_URL = 'https://YOUR-SERVICE.onrender.com';
   ```
6. Commit the change to `main`. GitHub Actions will redeploy the GitHub Pages frontend.

Do not leave the URL blank on GitHub Pages. The page can load while room creation fails if the frontend has no backend URL.

## Room codes

Click **Create a room** to let the server generate a unique room code. Share the code or use **Copy invite link**. Friends must connect to the same deployed backend and enter that code to join the existing room. Codes are case-insensitive. A room code that does not exist returns **Room not found** rather than silently creating a different room.

Room state is currently held in server memory, so rooms can be lost if the backend restarts or sleeps/restarts.

## Run locally

Requires Node.js 18 or newer.

```bash
npm install
npm start
```

Open http://localhost:3000.

## Tests

```bash
npm test
```
