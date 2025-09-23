# MMM-UCLStandings

A [MagicMirror²](https://magicmirror.builders/) module that renders the live UEFA Champions League league-phase table. The module consumes the open data published by the [openfootball](https://github.com/openfootball) project, calculates the standings in Node.js, and shows them on your mirror with your selected favorite team (Arsenal by default) highlighted in bold text.

## Features

- Automatically downloads the most recent results for the selected season from openfootball and gracefully falls back when the requested season file is not yet published.
- Computes the league-phase standings (points, goal difference, wins, etc.) in the Node helper.
- Displays a responsive table in the MagicMirror UI with configurable row count and header visibility.
- Highlights your favorite club in **bold** (defaults to Arsenal) and can display its crest above the table.

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
    maxRows: 12,
    updateInterval: 30 * 60 * 1000,
    showHeader: true,
    season: "latest",
    favoriteTeam: "Arsenal",
    favoriteTeamLogoUrl: null,
    enableSeasonFallback: true
  }
}
```

### Options

| Option | Default | Description |
| ------ | ------- | ----------- |
| `maxRows` | `12` | Number of teams to display. Set to `0` or `null` to show all teams. |
| `updateInterval` | `1800000` | Time in milliseconds between refreshes. |
| `showHeader` | `true` | Show or hide the module header. |
| `season` | `"latest"` | Season directory to request from openfootball. Use `"latest"` (default) or `"auto"` to always attempt the newest season. |
| `favoriteTeam` | `"Arsenal"` | Team name to emphasize in the table and to show above the standings. Leave empty to disable the favorite display. |
| `favoriteTeamLogoUrl` | `null` | Optional URL to the crest for the favorite team. When omitted the module checks `teamLogos` for a match. |
| `teamLogos` | `{ arsenal: "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg" }` | Map of lower-case team names to logo URLs. Extend or override this object in your config if you need additional crests. |
| `enableSeasonFallback` | `true` | When `true`, the helper automatically falls back to the most recent season with published data if the requested season (for example `2025-26`) is missing. Set to `false` to only attempt the specific season. |

### Favorite team crest tips

- Provide a `favoriteTeamLogoUrl` that points to a PNG or SVG hosted on a reliable CDN (for example, on Wikimedia) for the crispest image on the mirror.
- To support multiple favorites over time, extend `teamLogos` in your module configuration: any key you add should be the lower-case version of the team name returned by the standings data.
- If no crest can be resolved, the favorite team name still renders above the standings without an image so the module remains functional.

## Data source

Match data is retrieved from [`openfootball/champions-league`](https://github.com/openfootball/champions-league), specifically the season file at `https://raw.githubusercontent.com/openfootball/champions-league/master/<season>/cl.txt`. The helper requests the newest season first and, if that season file returns `404 Not Found` (as with the 2025-26 campaign prior to publication), it steps back through earlier seasons until data is available.

## Development

- `MMM-UCLStandings.js` contains the front-end code that builds the DOM in MagicMirror.
- `node_helper.js` handles downloading and parsing the data on the backend.
- `MMM-UCLStandings.css` defines the visual style for the standings table.

Run `npm install` to install dependencies for local development.

## License

[MIT](LICENSE)
