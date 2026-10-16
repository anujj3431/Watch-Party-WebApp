# Watch Party

A real-time watch-party app with room codes, chat, synchronized playback, a shared queue, room notifications, polls, and host moderation.

## Website

https://anujj3431.github.io/Watch-Party-WebApp/

## Required backend

GitHub Pages hosts the frontend only. The Node.js backend handles room creation/joining, WebSocket chat, queue and poll updates, host moderation, and WebRTC signaling.

The frontend is already configured to use the backend URL in `public/config.js`. The backend host must be deployed from the latest `main` commit for the updated features to work.

## Deploy backend on Render

This repository includes `render.yaml`:

1. Sign in to [Render](https://render.com/).
2. Choose **New → Blueprint** and connect this repository (or make sure the existing service is connected to this repo's `main` branch).
3. Deploy the `watch-party-backend` service from `render.yaml` if you are creating a new Blueprint service.
4. Ensure the service's URL matches `window.WATCH_PARTY_BACKEND_URL` in `public/config.js`.

If using an existing Render service, it should deploy each push to `main`; check Render's Events/Logs if the service still runs older code.

## Watch modes

The room host can choose **Upload video** to play a local MP4/WebM supported by the browser or **Share screen / tab** to stream a display capture to participants using WebRTC. The video file is read in the host's browser and streamed peer-to-peer; it is not uploaded to the hosting server. For movie audio with screen sharing, choose a browser tab and enable the browser's **Share tab audio** option.

WebRTC uses a public STUN server by default. For reliable connections across restrictive networks, configure a TURN service in the Render backend environment with TURN_URLS, TURN_USERNAME, and TURN_CREDENTIAL. These credentials are delivered to clients for WebRTC use; use scoped/short-lived credentials from your TURN provider. Without TURN, some network combinations will not connect. The frontend now shows the actual peer connection count rather than claiming that local capture means everyone is connected.

## Rooms and codes

Click **Create a room** to generate a unique room code. Share the code or use **Copy invite link**. Friends must connect to the same backend and enter that code to join. Codes are case-insensitive; a nonexistent code returns **Room not found** rather than silently creating a different room.

The room host can remove participants from the People tab. Removed identities cannot rejoin that room with the same tab identity while the room stays in memory. Room state is held in server memory, so rooms, polls, chat, and queue data can be lost when the backend restarts or sleeps/restarts.

## Polls and notifications

When creating a poll, select **Allow voters to choose multiple options** to let participants vote for more than one option. Otherwise, each participant can have one active choice. In-app notifications are sent for poll creation, queue additions, participant joins/leaves, and media start/stop.

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
