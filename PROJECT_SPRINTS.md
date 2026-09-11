# 🚀 ReckonMe! — Master Project Documentation

> **Last Updated:** 2026-08-12  
> **Status:** Sprint 2 Complete → Sprint 3 Up Next  
> **Purpose:** This file is the single source of truth for the entire project. Read this before making ANY changes.

---

## 📌 Table of Contents

1. [Project Overview](#-project-overview)
2. [Tech Stack](#-tech-stack)
3. [Architecture Overview](#-architecture-overview)
4. [File Map](#-file-map)
5. [Design System](#-design-system)
6. [Game Flow (How guessme.io Works)](#-game-flow)
7. [Data Models](#-data-models)
8. [Socket Events Reference](#-socket-events-reference)
9. [Sprint Log](#-sprint-log)
10. [Current UI State](#-current-ui-state)
11. [Known Issues & Tech Debt](#-known-issues--tech-debt)

---

## 🎯 Project Overview

**ReckonMe!** is a real-time multiplayer web party game inspired by [guessme.io](https://guessme.io).

### Core Game Loop
1. Friends join a room via a 5-character code.
2. Each round, a question is shown with multiple-choice options.
3. Every player selects an answer privately.
4. Then every player guesses what EACH OTHER player chose.
5. Points awarded for correct guesses.
6. After all rounds, highest score wins.

### Key Differentiators from guessme.io
- **Custom Question Banks:** Hosts can create and upload their own questions with options.
- **Neo-Brutalist Space Theme:** Unique aesthetic with particles, Lottie animations, DiceBear avatars.
- **Production-grade architecture:** Redis-backed state, Socket.io with Redis adapter, scalable to 10k concurrent players.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend Framework** | React 18 + Vite | Fast dev server, HMR |
| **Styling** | Tailwind CSS | Utility-first CSS |
| **Animations** | Framer Motion + Lottie-React | Page transitions, micro-animations |
| **State Management** | Zustand (persisted) | Global client state |
| **Routing** | React Router v6 | Client-side routing |
| **Backend Runtime** | Node.js + Express | REST API + Socket server |
| **Real-time** | Socket.io (with Redis Adapter) | Bidirectional events |
| **Primary DB** | MongoDB (Mongoose) | Persistent data (rooms, results, users) |
| **Cache/Pub-Sub** | Redis | Session store, room state, Socket.io adapter |
| **Avatars** | DiceBear API (Croodles) | Procedurally generated player avatars |
| **Notifications** | Sonner | Toast notifications matching theme |
| **Custom Cursor** | SmoothCursor component | Premium feel |

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (React/Vite)                     │
│                                                              │
│  Landing ─→ Lobby ─→ Game ─→ Results                        │
│     │          │        │        │                            │
│  roomStore  roomStore  gameStore  gameStore                   │
│     │          │        │        │                            │
│  Socket.io ←──┴────────┴────────┘                            │
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket + HTTP
┌──────────────────────┴──────────────────────────────────────┐
│                     SERVER (Node/Express)                     │
│                                                              │
│  REST Routes (/api/room, /api/auth)                          │
│  Socket Handlers (room, game, chat)                          │
│     │                                                        │
│  Services (GameService, RoomService)                         │
│     │                                                        │
│  Models (Room, GameResult, User, Message)                     │
│     │              │                                         │
│  MongoDB       Redis (SessionStore + Socket.io Adapter)       │
└──────────────────────────────────────────────────────────────┘
```

---

## 📁 File Map

### Server (`server/`)
```
server/
├── index.js                          # Express server entry point (port 8747)
├── .env                              # ORIGIN, MONGODB_URI, JWT_KEY, etc.
├── controllers/                      # REST API controllers
├── middlewares/                       # Auth middleware (JWT)
├── models/
│   ├── RoomModel.js                  # Room schema (players, rounds, gameState, settings, timers)
│   ├── GameResult.js                 # Persisted game results (30-day TTL)
│   ├── UserModel.js                  # User auth model
│   └── Message.js                    # Chat message model
├── routes/                           # Express routes (/api/room, /api/auth)
├── services/
│   ├── GameService.js                # startGame, endGame, handleAnswer logic
│   └── RoomService.js                # Room CRUD helpers
└── socket/
    ├── socket.js                     # Socket.io init, Redis adapter, disconnect handling
    ├── handlers/
    │   ├── roomHandlers.js           # create-room, join-room, rejoin-room, leave-room, etc.
    │   ├── gameHandlers.js           # player-ready, start-game, submit-answer
    │   └── chatHandlers.js           # send-message handler
    └── store/
        └── SessionStore.js           # Redis-backed session store (socketId ↔ playerId)
```

### Client (`client/src/`)
```
client/src/
├── main.jsx                          # React entry point
├── App.jsx                           # BrowserRouter, AnimatePresence, route definitions
├── index.css                         # Global Tailwind + custom styles
├── App.css                           # Additional app styles
├── Fonts/                            # IndieSellout custom font
├── assets/
│   └── Lotties/
│       ├── Loading.json              # 3-dot loading animation (bg removed)
│       └── Timer.json                # Clock/timer animation
├── components/
│   ├── RoomAccessHandler.jsx         # Route guard: validates room, handles create/join/rejoin
│   ├── Particles.jsx                 # Space-themed background particles
│   ├── ui/
│   │   ├── ReckonLoader.jsx          # Cosmic eye loader component
│   │   ├── RoomShareCopyBtn.jsx      # Room code/link copy buttons
│   │   ├── SmoothCursor.jsx          # Custom animated cursor
│   │   └── smooth-cursor.jsx         # Cursor implementation
│   ├── magicui/
│   │   └── highlighter.jsx           # Highlighter text effect
│   └── lobby/
│       ├── PlayerList.jsx            # Player cards with avatars, roles, ready state
│       ├── GameSetup.jsx             # Room invite, name setting, settings floating panel
│       ├── SmartChat.jsx             # Floating chat panel
│       └── CustomQuestionsForm.jsx   # Modal for creating custom question banks
├── pages/
│   ├── Landing.jsx                   # Home page with Create/Join room
│   ├── Lobby.jsx                     # Main lobby (players, setup, floating panels)
│   ├── Game.jsx                      # 🚧 PLACEHOLDER — Sprint 3 target
│   ├── Results.jsx                   # 🚧 PLACEHOLDER — Sprint 4 target
│   ├── Auth.jsx / SignIn / SignUp     # Authentication pages
│   ├── Profile.jsx                   # User profile
│   ├── Navbar.jsx / Footer.jsx       # Layout components
│   └── NotFound.jsx                  # 404 page
├── store/
│   ├── index.js                      # App store (user auth state)
│   ├── roomStore.js                  # Zustand: room, player, timer (persisted)
│   └── gameStore.js                  # Zustand: gameState, currentQuestion, answers, guesses
├── lib/
│   └── api-client.js                 # Axios instance
└── utils/
    └── constants.js                  # API endpoint constants
```

---

## 🎨 Design System

### Theme: Neo-Brutalist Space
- **Primary Background:** `#0A0A0A` (deep black with animated particle stars)
- **Primary Accent:** `#4D4C7D` (muted purple, used in Highlighter)
- **Secondary Accent:** `#87CEFA` (light sky blue, used in headings, settings)
- **Tertiary Accent:** `#00E5FF` (cyan, used in active states, player borders)
- **Warning/Timer:** `rose-400` (timer countdown)
- **Action Accent:** `#E48F45` (orange, used in step badges)
- **Text:** White with opacity variants (`text-white/40`, `text-white/70`, `text-white/90`)
- **Font:** `IndieSellout` (custom, playful, all-caps feel) via `font-['IndieSellout']`

### UI Patterns
- **Neo-Brutalist Shadows:** `shadow-[3px_3px_0px_white]` with hover inverting to `hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px]`
- **Opposite Hover on Floating Buttons:** Buttons start flat, hover adds shadow and pops UP/LEFT: `hover:shadow-[4px_4px_0px_black] hover:-translate-x-[4px] hover:-translate-y-[4px]`
- **Floating Action Menu:** 3 vertical buttons stacked bottom-right (How2Play, Settings, Chat). Panels dock side-by-side dynamically using `openPanels` state array and `getPanelPositionClass()`.
- **Dashed Borders:** `border-4 border-dashed border-[#4D4C7D]` for panel dividers
- **Highlighter Tags:** Orange `#1` and Cyan `#2` angled step indicators on setup sections
- **Avatars:** DiceBear Croodles, transparent background, no borders
- **Lotties:** Timer.json (inverted white via CSS `filter invert`), Loading.json (transparent bg, removed Black Solid layer)

---

## 🎮 Game Flow

### Phase State Machine
```
LOBBY → INPUT (Asynchronous Answer & Guess) → REVEALING (Next Button Skip) → ENDED
  │                                                                         │
  └────────────────────────────── PLAY AGAIN ───────────────────────────────┘
```

### Detailed Flow (Story Theme inspired by guessme.io)
1. **LOBBY** — Players join, set names, pick avatars, host configures settings. Host presses "Start Game".
2. **INPUT** — A question with options is shown. 
   - Player selects their honest answer privately.
   - Instantly, a divider appears below asking them to guess their opponent's choice.
   - Player selects their guess.
   - Player waits for the opponent to finish both steps.
3. **REVEALING** — Show results: who picked what, who guessed correctly. Points awarded via animated +1 balloons.
4. **Next Round** — A "NEXT" button appears. If both players click it, the timer drops to 5s and the next round begins.
5. **ENDED** — Final leaderboard with podium. "Play Again" option.

### Question Format (from guessme.io inspiration)
```json
{
  "text": "What game is the best?",
  "options": ["Sims 4", "GTA V", "Minecraft"],
  "category": "comfy"
}
```
- Questions can have 2-4 options.
- Some questions are open-ended ("Fav Food") — players type their own answer, then others guess from a list of all answers.
- Custom questions follow the same format; host creates them via the `CustomQuestionsForm`.

---

## 📊 Data Models

### Room (MongoDB — `RoomModel.js`)
```javascript
{
  roomId: "ABCDE",            // 5-char uppercase code
  status: "lobby",            // "lobby" | "answering" | "guessing" | "revealing" | "ended"
  players: [{
    id: String,               // nanoid
    name: String,
    avatarSeed: String,       // DiceBear seed
    score: Number,
    isHost: Boolean,
    ready: Boolean,
    lastActive: Date,
    disconnectedAt: Date,
    answers: [{ questionId, answer, timestamp }],
    guesses: [{ questionId, targetPlayerId, guess, isCorrect, timestamp }]
  }],
  maxPlayers: 2,              // Currently 2-player, will scale
  isLocked: Boolean,
  gameState: {
    phase: "lobby",           // State machine phase
    currentQuestion: Number,
    totalQuestions: Number,
    startedAt: Date,
    endedAt: Date
  },
  settings: {
    lobbyTimeout: 300,        // seconds
    gameTimeout: 600,
    questionsPerGame: 5,
    timePerQuestion: 60,
    useCustomQuestions: Boolean,
    customQuestions: Array
  },
  rounds: [{
    roundNumber: Number,
    question: String,
    answers: Map,             // playerId → answer
    guesses: Map              // playerId → { guess, correct }
  }],
  currentRound: Number,
  winnerId: String,
  leaderboard: [{ playerId, name, score }],
  timers: { lobbyExpiry, gameExpiry, lastTick },
  expiresAt: Date
}
```

### GameResult (MongoDB — persisted 30 days)
Stores completed game stats: players, scores, answers, guesses, winner, duration.

### Zustand Stores (Client)
- **roomStore** (persisted to localStorage): `room`, `player`, `timer`, actions for CRUD
- **gameStore**: `gameState`, `currentQuestion`, `playerAnswers`, `playerGuesses`, `gameResult`
- **appStore** (index.js): `userInfo` for authentication

---

## 📡 Socket Events Reference

### Room Events (roomHandlers.js)
| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `create-room` | Client → Server | `{ roomId, player }` | Host creates a new room |
| `join-room` | Client → Server | `{ roomId, player }` | Player joins existing room |
| `rejoin-room` | Client → Server | `{ roomId, player }` | Reconnect after disconnect |
| `leave-room` | Client → Server | `{ roomId, playerId }` | Player leaves voluntarily |
| `update-player-name` | Client → Server | `{ roomId, playerId, name }` | Set/change display name |
| `update-player-avatar` | Client → Server | `{ roomId, playerId, avatarSeed }` | Shuffle avatar |
| `update-room-settings` | Client → Server | `{ roomId, hostId, settings }` | Host updates game config |
| `kick-player` | Client → Server | `{ roomId, hostId, targetPlayerId }` | Host kicks a player |
| `room-updated` | Server → Client | Room object | Full room state broadcast |
| `room-timer` | Server → Client | `timeLeft` (seconds) | Countdown tick every 1s |
| `room-expired` | Server → Client | `{ message }` | Room timed out |
| `room-deleted` | Server → Client | `{ message }` | Room removed |
| `host-changed` | Server → Client | `{ newHostId, message }` | Host promotion |
| `player-reconnected` | Server → Client | `{ playerId, playerName }` | Player came back |
| `kicked-from-room` | Server → Client | `{ message }` | You were kicked |

### Game Events (gameHandlers.js)
| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `player-ready` | Client → Server | `{ roomId, playerId, ready }` | Toggle ready state |
| `start-game` | Client → Server | `{ roomId, hostId }` | Host starts the game |
| `submit-answer` | Client → Server | `{ roomId, playerId, questionId, answer }` | Player submits answer |
| `game-started` | Server → Client | `{ status, settings }` | Game has begun |
| `answer-submitted` | Server → Client | `{ questionId, playerId, allAnswered }` | Someone answered |
| `game-ended` | Server → Client | `{ reason, result }` | Game over |

### Chat Events (chatHandlers.js)
| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `send-message` | Client → Server | `{ roomId, playerId, message }` | Send chat message |
| `receive-message` | Server → Client | `{ playerId, message, timestamp }` | New message |

---

## 🏃‍♂️ Sprint Log

### ✅ Sprint 1: Foundation & Lobby Architecture
**Completed:** Room creation, joining, socket connections, Redis session store, landing page, basic lobby UI, DiceBear avatars, RoomAccessHandler, toast notifications.

### ✅ Sprint 2: UI Polish, Chat & Custom Questions
**Completed:**
- `ReckonLoader` cosmic eye loader replaced all old loaders
- Floating Action Menu (3 vertical buttons: How2Play, Settings, Chat)
- Dynamic panel docking system (`openPanels` array, `getPanelPositionClass()`)
- All panels have close buttons and never overlap
- SmartChat real-time messaging
- Game Settings floating panel (Default vs Custom Questions)
- `CustomQuestionsForm` modal for hosts
- PlayerList redesign: transparent cards, role badges (HOST/PLAYER), enlarged Lotties
- Timer Lottie: CSS `filter invert` for visibility, enlarged to match countdown text
- Removed browser `alert()` and `beforeunload` popups for seamless refresh
- Space background visible through transparent lobby UI

### 🚧 Sprint 3: The Core Game Loop & Scalability (DEEP DIVE)
**Goal:** Transition from Lobby → Game page. Implement a scalable, production-grade game engine capable of handling 10k concurrents, with Redis-backed question pooling and server-authoritative state machines.

**Core Architecture & Scaling Tasks:**
- [ ] **Data Strategy:** Implement `SRANDMEMBER` in Redis for instant O(1) random question fetching across millions of records.
- [ ] **State Machine:** Robust server-side game loop (Lobby → Answering → Guessing → Revealing) using Redis pub/sub or strictly managed Node intervals.
- [ ] **Game.jsx UI:** Build the phase-aware React UI with Neo-brutalist styling and Framer Motion micro-interactions.
- [ ] **Results UI:** Build a highly visual, "Spotify Wrapped" style shareable scorecard using `html2canvas`.
- [ ] **Unique Twists:** Integrate ReckonMe-exclusive features (e.g., Streaks, Power-ups) as defined in `reckonme_unique_features.md`.

### 📅 Sprint 4: Scoring, Leaderboard & Polish (PLANNED)
- Scoring logic (points per correct guess, time bonus)
- Round results with animations
- Final podium leaderboard (1st/2nd/3rd)
- Play Again flow
- Sound effects
- Scale testing

---

## 🖼 Current UI State

### Landing Page
- Neo-brutalist cards for "Create Room" and "Join Room"
- Animated particles background
- Custom cursor (`SmoothCursor`)

### Lobby Page
- **Header:** "Welcome to ReckonMe!" with purple Highlighter
- **Top-right:** Animated Timer Lottie (inverted white, `w-20 h-20`) + bouncing countdown + "Leave Room" button
- **Left Panel:** PlayerList (transparent cards, role badges at top-left, avatars, ready state with Loading Lottie or checkmark)
- **Right Panel:** GameSetup (Room Invite with `#1` tag, Set Your Name with `#2` tag, Ready/Start buttons)
- **Bottom-right:** 3 stacked floating buttons (How2Play at top, Settings in middle, Chat at bottom)
  - Each opens a 350px-wide card panel that docks side-by-side
  - All have `(X)` close buttons
  - Dynamic positioning via `getPanelPositionClass()`

### Game Page (placeholder)
- Currently just `<div>Game is playinggggggggg</div>`
- **Sprint 3 will build this out completely**

---

## ⚠ Known Issues & Tech Debt

1. **2-player limit:** `maxPlayers: 2` is hardcoded. Scaling to N players is a Sprint 4+ task.
2. **No default question bank:** Server has no built-in questions yet. Sprint 3 must seed a question bank.
3. **GameService.handleAnswer** doesn't handle the guessing phase yet — only answering.
4. **GameService.endGame** has a Map iteration bug (`.entries()` on Mongoose Map may behave differently).
5. **No `submit-guess` socket event** yet — only `submit-answer` exists.
6. **gameStore** references `socket` in `get()` but socket isn't stored there — needs refactoring.
7. **Room expiry timer** runs in-memory per Node instance. For multi-instance scaling, move to Redis key expiry with pub/sub.
8. **No sound effects** — planned for Sprint 4.
9. **`remove_bg.js`** utility script in root — can be deleted (was used once to strip Lottie bg).

---

> **🤖 Agent Instructions:** Always read this file first when resuming work. Check the Sprint Log to know current progress. Follow the Design System for all UI work. Use the Socket Events Reference when adding new real-time features.
