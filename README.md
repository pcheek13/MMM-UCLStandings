# MMM-UCLStandings

A [MagicMirror²](https://magicmirror.builders/) module that renders the live UEFA Champions League league-phase table. The module consumes the open data published by the [openfootball](https://github.com/openfootball) project, calculates the standings in Node.js, and shows them on your mirror with Arsenal highlighted in bold text.

## Features

- Automatically downloads the most recent results for the selected season from openfootball.
- Computes the league-phase standings (points, goal difference, wins, etc.) in the Node helper.
- Displays a responsive table in the MagicMirror UI with configurable row count and header visibility.
- Arsenal always appears in **bold** to make sure it stands out on your mirror.

## Installation

1. Navigate to your `MagicMirror/modules` directory:

   ```bash
   cd ~/MagicMirror/modules
   ```

2. Clone this repository:

   ```bash
   git clone https://github.com/pcheek13/MMM-UCLStandings.git
   ```

3. Install the module dependencies:

   ```bash
   cd MMM-UCLStandings
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
    season: "2024-25"
  }
}
```

### Options

| Option | Default | Description |
| ------ | ------- | ----------- |
| `maxRows` | `12` | Number of teams to display. Set to `0` or `null` to show all teams. |
| `updateInterval` | `1800000` | Time in milliseconds between refreshes. |
| `showHeader` | `true` | Show or hide the module header. |
| `season` | `"2024-25"` | Season directory to request from openfootball. |

## Data source

Match data is retrieved from [`openfootball/champions-league`](https://github.com/openfootball/champions-league), specifically the season file at `https://raw.githubusercontent.com/openfootball/champions-league/master/<season>/cl.txt`. The module parses results from the league phase and calculates the current table locally.

## Development

- `MMM-UCLStandings.js` contains the front-end code that builds the DOM in MagicMirror.
- `node_helper.js` handles downloading and parsing the data on the backend.
- `MMM-UCLStandings.css` defines the visual style for the standings table.

Run `npm install` to install dependencies for local development.

## License

[MIT](LICENSE)
