# WoWtron 🎮

The ultimate all-in-one platform for World of Warcraft guild management, raid planning, Mythic+ tracking, and player recruitment.

![WoWtron](public/wowtron-logo.png)

## Features

- **Guild Management** - Manage your roster, ranks, and settings all in one place
- **Raid Planning** - Schedule raids, track signups, and manage attendance
- **M+ Tracker** - Track Mythic+ scores, weekly affixes, and dungeon progress
- **Log Analysis** - Upload Warcraft Logs and get AI-powered insights with video-editor style timeline
- **Recruitment** - Find the perfect players with smart matching and anti-booster detection
- **Player Cards** - Detailed player profiles with performance metrics

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui + Radix UI
- **Icons**: Lucide React
- **Charts**: Recharts
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/kurashitai/wowtron.git
cd wowtron

# Install dependencies
bun install

# Run development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

### Build for Production

```bash
bun build
bun start
```

## Project Structure

```
wowtron/
├── public/              # Static assets
│   └── wowtron-logo.png
├── src/
│   ├── app/             # Next.js App Router pages
│   │   ├── page.tsx     # Main application
│   │   ├── layout.tsx   # Root layout
│   │   └── globals.css  # Global styles
│   ├── components/      # React components
│   │   ├── ui/          # shadcn/ui components
│   │   └── log-analysis.tsx  # Log analysis feature
│   ├── lib/             # Utility libraries
│   │   ├── wow-data.ts  # WoW class/rank data
│   │   ├── mock-data.ts # Demo data
│   │   └── combat-logs.ts # Combat log parsing
│   └── hooks/           # React hooks
├── tailwind.config.ts   # Tailwind configuration
└── next.config.ts       # Next.js configuration
```

## Log Analysis Features

The Log Analysis module includes:

- **Video-editor style timeline** with play/pause, speed controls (0.5x-4x), and skip buttons
- **Real-time event log** synced with timeline position
- **DPS/HPS/DTPS graphs** with player selection
- **Boss ability breakdown** with target tracking
- **Comprehensive metrics**: Deaths, interrupts, dispels, buff uptime, consumables
- **Sortable player tables** with rank percentages

### WCL Cache (new)

To avoid re-fetching the same report/fight over and over, the API now caches WCL responses on disk:

- Report cache TTL: **6 hours**
- Fight cache TTL: **1 hour**
- Cache location: `.wowtron-cache/wcl/`
- Force refresh: add `&refresh=true` to `/api/wcl` requests

Examples:

```bash
/api/wcl?action=report&code=YOUR_REPORT_CODE
/api/wcl?action=fight&code=YOUR_REPORT_CODE&fightId=12
/api/wcl?action=fight&code=YOUR_REPORT_CODE&fightId=12&refresh=true
```

### Player Profile API (MVP)

Player pages now support an aggregated profile endpoint:

```bash
/api/player/{region}/{realm}/{name}
/api/player/{region}/{realm}/{name}/sync
/api/player/{region}/{realm}/{name}/sync-status
/api/player/{region}/{realm}/{name}/history
/api/player/supabase-check
/api/raid-brief/discord
```

And a UI route:

```bash
/players/{region}/{realm}/{name}
```

Data currently merges public Raider.IO + Blizzard profile/equipment (when Blizzard credentials are available), with cache support.
Profile sync snapshots are persisted in `.wowtron-cache/player-history/` (up to last 100 snapshots per player).

If `SUPABASE_URL` + (`SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`) are configured, snapshot persistence uses Supabase (free tier friendly) instead of local files.
Detailed setup guide: `docs/supabase-setup-guide.md`.

For native Discord brief posting, configure:

```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project on [Vercel](https://vercel.com)
3. Vercel will auto-detect Next.js and configure the build

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/kurashitai/wowtron)

## Color Scheme

WoWtron uses a WoW-inspired color palette:

- **Gold**: `#FFD700` - Primary accent
- **Purple**: `#8B5CF6` - Secondary accent  
- **Blue**: `#1E90FF` - Info elements
- **Silver**: `#C0C0C0` - Text and borders

## License

MIT License - feel free to use for your own WoW guild!

---

Made with ❤️ for the WoW community
