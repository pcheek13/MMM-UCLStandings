# MMM-WNBAFeverStats

MagicMirror² module that keeps Indiana Fever fans up to date with live WNBA player statistics and the next scheduled games. When the Fever are on the court the module shows real-time box score details for every player. Between games it highlights the next three matchups so you always know when to tune in.

## Features

- Live game detection powered by the public ESPN WNBA API.
- Player level stat lines for points, rebounds, assists, and steals.
- Automatic scoreboard with opponent, venue, and current game clock description.
- Upcoming schedule list (up to three entries) whenever no games are live.
- Configurable favorite team identifier, title text, and update interval.

## Installation

1. Navigate to the `modules` directory of your MagicMirror² installation:

   ```bash
   cd ~/MagicMirror/modules
   ```

2. Clone or copy this repository into the modules folder and install dependencies:

   ```bash
   git clone <your-fork-url> MMM-WNBAFeverStats
   cd MMM-WNBAFeverStats
   npm install
   ```

   > **Note:** The module depends on the public ESPN API. Depending on your network setup you may need to allow outbound HTTPS requests for the MagicMirror² host.

3. Configure the module in `config/config.js` as shown below.

## Configuration

Add the module to the `modules` array in your MagicMirror `config.js` file:

```javascript
{
  module: "MMM-WNBAFeverStats",
  position: "top_left",
  config: {
    favoriteTeamId: "ind", // ESPN identifier for the Indiana Fever
    favoriteTeamDisplayName: "Indiana Fever",
    headerText: "Indiana Fever Live Stats",
    updateInterval: 5 * 60 * 1000, // 5 minutes
    maxUpcoming: 3
  }
}
```

### Configuration Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `favoriteTeamId` | `string` | `"ind"` | Team identifier used by the ESPN API. The default is the Indiana Fever. |
| `favoriteTeamDisplayName` | `string` | `"Indiana Fever"` | Friendly team name used within the UI. |
| `headerText` | `string` | `"Indiana Fever Live Stats"` | Custom header text displayed by MagicMirror². |
| `updateInterval` | `number` | `300000` | Refresh interval in milliseconds. Minimum enforced interval is 60 seconds. |
| `maxUpcoming` | `number` | `3` | Maximum number of upcoming games to show when there is no live game. |

## Data Sources

All statistics and schedule information are fetched from the ESPN public WNBA endpoints:

- `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams/{teamId}/schedule`
- `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/summary?event={eventId}`

The module gracefully handles network or data errors by showing an error message in the MagicMirror² interface.

## Development Notes

- The Node helper caches the module configuration and polls the ESPN API at the configured interval.
- Player statistics are dynamically mapped based on the label names provided by the API so new fields can be added in the future with minimal changes.
- Upcoming game entries show whether the Fever are home (`vs`) or away (`@`) and include the scheduled tip time using the MagicMirror host locale.

## License

MIT – see the [LICENSE](LICENSE) file for details.
