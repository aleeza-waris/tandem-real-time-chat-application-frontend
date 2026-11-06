# Tandem Frontend

The frontend is a responsive one-to-one chat client built with Next.js App Router. It uses the Tandem API for authentication and persisted data, and Socket.IO for live chat and presence.

## Stack

- Next.js 15, React 18, and TypeScript
- Ant Design and Tailwind CSS 4
- Redux Toolkit for UI state and TanStack Query for server state/cache
- Axios for HTTP requests and `socket.io-client` for real-time events
- React Hook Form and Zod for authentication forms
- Emoji Picker, Lottie animations, Lucide icons, and optional Google OAuth

## Prerequisites

- Node.js and npm
- A running Tandem backend and its MongoDB connection; see [`../tendem-backend/README.md`](../tendem-backend/README.md)

The package does not declare a Node.js engine version. Use a current Node.js release compatible with the dependencies.

## Setup

From this directory, create a local environment file from the committed example, then install dependencies and start the development server:

```sh
cp .env.example .env.local
npm ci
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env.local` for the first command. The app is available at `http://localhost:3000` by default. Start the backend separately, normally at `http://localhost:4000`.

## Environment variables

The checked-in [`.env.example`](.env.example) contains these frontend-only settings:

| Variable | Purpose | Local value | Production value |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Base URL for HTTP API requests. Include the `/api` prefix. | `http://localhost:4000/api` | `https://tendem-backend.onrender.com/api` |
| `NEXT_PUBLIC_SOCKET_URL` | Backend origin used for Socket.IO, without `/api`. If omitted, the client removes the trailing `/api` from `NEXT_PUBLIC_API_URL`. | `http://localhost:4000` | `https://tendem-backend.onrender.com` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Optional Google sign-in client ID. Leave empty to hide Google sign-in. | Set to your OAuth client ID, or leave empty. | Set to the same OAuth client ID configured on the backend, or leave empty. |

`NEXT_PUBLIC_*` values are included in browser-side code; do not put secrets in them. Set the frontend Google client ID to the same OAuth client ID as backend `GOOGLE_CLIENT_ID`. Configure the OAuth client to allow the frontend's local or deployed origin.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Run the Next.js development server. |
| `npm run build` | Create the production build. |
| `npm start` | Serve the existing production build. Run `npm run build` first. |

These are the scripts defined in `package.json`; no frontend test or lint script is configured there.

## Features and integrations

- Register and sign in with email and password, or use Google sign-in when configured.
- Search users by name or email, start one-to-one conversations, and browse recent conversations and unread counts.
- Load persisted message history in pages, send messages in real time, add emoji, and see typing indicators and online presence.
- Update a display name and upload or remove a profile avatar.
- Adapt the chat layout for mobile and desktop.

The Axios client uses `NEXT_PUBLIC_API_URL`, attaches the saved bearer session token, and unwraps the API response envelope. The session token is stored in browser `localStorage`; an unauthorized API response clears the session and signs the UI out. TanStack Query handles API data and cache refresh, while Redux Toolkit holds client chat state.

The Socket.IO client connects to `NEXT_PUBLIC_SOCKET_URL` and sends the current session token in the Socket.IO `auth` handshake. The backend authenticates that token before accepting the connection. The UI uses `presence:snapshot`, `presence:changed`, `conversation:updated`, `message:new`, and `typing:changed`; it emits `conversation:join`, `conversation:leave`, `message:send`, and `typing:update`.

## Project structure

```text
src/
  app/          App Router page, layout, global styles, and error/loading states
  components/   Authentication, conversation list, chat window, emoji, and providers
  lib/          API client, session-token storage, and Socket.IO client
  schemas/      Frontend form validation schemas
  store/        Redux store, hooks, and chat slice
  types/        Shared frontend chat types
public/         Static assets and animation data
```

## Production deployment

Deploy the Next.js app to a Node.js-capable host using the production build and start commands above. Supply the `NEXT_PUBLIC_*` settings in the frontend hosting environment **before building**, since these values are exposed to and embedded in browser code.

For the deployed services, set these frontend variables in the hosting environment before creating the production build:

```dotenv
NEXT_PUBLIC_API_URL=https://tendem-backend.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=https://tendem-backend.onrender.com
```

The deployed frontend origin is `https://tandem-real-time-chat-application-f.vercel.app`. Set the backend's `FRONTEND_URL` to that origin. Both `NEXT_PUBLIC_*` URLs are embedded in the frontend at build time; rebuild and redeploy after changing them. The Axios client falls back to `http://localhost:4000/api` if `NEXT_PUBLIC_API_URL` is missing. Socket.IO uses `NEXT_PUBLIC_SOCKET_URL`, or derives its origin from the API URL when that variable is missing. Explicitly set both production values above so neither connection targets localhost or a stale origin. Keep the Socket.IO URL at the backend origin, without `/api`, and ensure the hosting proxy permits Socket.IO connections.

## Related Repository

- **Backend:** [Tandem Backend](https://github.com/aleeza-waris/tandem-real-time-chat-application-backend)