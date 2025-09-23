# MMM-UCLStandings

A [MagicMirror²](https://magicmirror.builders/) module that renders the live UEFA Champions League league-phase table. The module consumes the official [football-data.org](https://www.football-data.org/) API, displays club crests, highlights your selected favorite team (Arsenal by default), and surfaces its next scheduled Champions League fixtures.

## Features

- Pulls real-time league-phase standings directly from football-data.org (requires a free API token).
- Renders club crests alongside team names and bolds your configured favorite club.
- Shows the favorite club's crest at the top of the module and lists its next three UEFA Champions League matches with opponent, date, and location.
- Offers configurable refresh intervals, maximum visible rows (favorite team is always shown), optional headers, and optional upcoming-match display.

## Installation

Copy and paste the following block into your terminal on the Raspberry Pi (or wherever MagicMirror² is installed) to place the module in the correct directory and install its dependencies:

```bash
cd ~/MagicMirror/modules && \
  git clone https://github.com/pcheek13/MMM-UCLStandings.git && \
  cd MMM-UCLStandings && \
  npm install
```

## Configuration

Add the module to the `modules` array in your `config/config.js` file:

```javascript
{
  module: "MMM-UCLStandings",
  position: "top_left",
  config: {
    apiAuthToken: "YOUR_FOOTBALL_DATA_TOKEN",
    maxRows: 10,
    updateInterval: 30 * 60 * 1000,
    showHeader: true,
    season: "latest",
    favoriteTeam: "Arsenal",
    favoriteTeamLogoUrl: null,
    showUpcomingMatches: true,
    upcomingMatchLimit: 3
  }
}
```

### Options

| Option | Default | Description |
| ------ | ------- | ----------- |
| `apiAuthToken` | `""` | Your football-data.org API token. Requests will fail without a valid token. |
| `maxRows` | `10` | Number of teams to display. The module always includes the favorite club even if it falls outside this limit. Set to `0` or `null` to show all teams. |
| `updateInterval` | `1800000` | Time in milliseconds between refreshes (default 30 minutes). |
| `showHeader` | `true` | Show or hide the module header. |
| `season` | `"latest"` | Set to a specific starting year (e.g., `"2024"`) to lock the table to that campaign. Leave as `"latest"` to follow the current season. |
| `favoriteTeam` | `"Arsenal"` | Team name to emphasize in the table and to show above the standings. Leave empty to disable the favorite display. |
| `favoriteTeamLogoUrl` | `null` | Optional override URL for the favorite team crest. When omitted, the crest provided by football-data.org is used. |
| `showUpcomingMatches` | `true` | Set to `false` to hide the upcoming match list. |
| `upcomingMatchLimit` | `3` | Number of future fixtures to display for the favorite club (maximum enforced by football-data.org is 10). |

### football-data.org API setup

1. Sign up for a free developer account at [football-data.org](https://www.football-data.org/client/register).
2. Generate a personal API token from your dashboard.
3. Paste the token into the module configuration as `apiAuthToken`.

Tokens are rate-limited (typically 10 requests per minute on the free tier). The default `updateInterval` of 30 minutes respects those limits.

### Favorite team crest tips

- If you prefer a custom crest, supply a `favoriteTeamLogoUrl` pointing to a PNG or SVG hosted on a reliable CDN (for example, on Wikimedia Commons).
- When no override is provided, the official crest returned by football-data.org is used automatically.

## Data source

Standings and fixture data are retrieved from the [football-data.org v4 API](https://www.football-data.org/documentation/quickstart). The module requests `https://api.football-data.org/v4/competitions/CL/standings` for table data and, when a favorite club is configured, `https://api.football-data.org/v4/teams/<TEAM_ID>/matches` for the next scheduled UEFA Champions League fixtures.

## Development

- `MMM-UCLStandings.js` contains the front-end code that builds the DOM in MagicMirror.
- `node_helper.js` handles downloading standings and fixture data from football-data.org.
- `MMM-UCLStandings.css` defines the visual style for the standings table and upcoming match list.

Run `npm install` to install dependencies for local development.

## License

[MIT](LICENSE)
