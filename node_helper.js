const NodeHelper = require("node_helper");
const fetch = require("node-fetch");
const { HttpsProxyAgent } = require("https-proxy-agent");

const DEFAULT_SOURCE = "https://raw.githubusercontent.com/openfootball/champions-league/master";

function createProxyAgent() {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
  if (!proxyUrl) {
    return undefined;
  }

  try {
    return new HttpsProxyAgent(proxyUrl);
  } catch (error) {
    console.error(`MMM-UCLStandings: Failed to create proxy agent: ${error.message}`);
    return undefined;
  }
}

function ensureTeam(map, name) {
  if (!map.has(name)) {
    map.set(name, {
      team: name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0
    });
  }
  return map.get(name);
}

function normalizeName(name) {
  return name.replace(/\s{2,}/g, " ").trim();
}

function updateTeamStats(teamRecord, goalsFor, goalsAgainst) {
  teamRecord.played += 1;
  teamRecord.goalsFor += goalsFor;
  teamRecord.goalsAgainst += goalsAgainst;
  teamRecord.goalDifference = teamRecord.goalsFor - teamRecord.goalsAgainst;

  if (goalsFor > goalsAgainst) {
    teamRecord.wins += 1;
    teamRecord.points += 3;
  } else if (goalsFor === goalsAgainst) {
    teamRecord.draws += 1;
    teamRecord.points += 1;
  } else {
    teamRecord.losses += 1;
  }
}

function parseStandings(rawText) {
  const lines = rawText.split(/\r?\n/);
  const teamMap = new Map();
  let inLeagueStage = false;
  const stageHeaderRegex = /^»\s*([^,]+)/;
  const matchRegex = /^\s*(?:\d{1,2}\.\d{2}\s+)?(.+?)\s+v\s+(.+?)\s+(\d+)-(\d+)(?:\s+\(.+?\))?\s*$/;

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("»")) {
      const stageMatch = trimmed.match(stageHeaderRegex);
      if (stageMatch) {
        const stage = stageMatch[1].toLowerCase();
        inLeagueStage = stage.startsWith("league");
      }
      return;
    }

    if (!inLeagueStage) {
      return;
    }

    const match = line.match(matchRegex);
    if (!match) {
      return;
    }

    const homeTeam = normalizeName(match[1]);
    const awayTeam = normalizeName(match[2]);
    const homeGoals = parseInt(match[3], 10);
    const awayGoals = parseInt(match[4], 10);

    if (Number.isNaN(homeGoals) || Number.isNaN(awayGoals)) {
      return;
    }

    const homeRecord = ensureTeam(teamMap, homeTeam);
    const awayRecord = ensureTeam(teamMap, awayTeam);

    updateTeamStats(homeRecord, homeGoals, awayGoals);
    updateTeamStats(awayRecord, awayGoals, homeGoals);
  });

  const table = Array.from(teamMap.values());

  table.sort((a, b) => {
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    if (b.goalDifference !== a.goalDifference) {
      return b.goalDifference - a.goalDifference;
    }
    if (b.goalsFor !== a.goalsFor) {
      return b.goalsFor - a.goalsFor;
    }
    return a.team.localeCompare(b.team);
  });

  return table.map((entry, index) => ({
    position: index + 1,
    ...entry
  }));
}

module.exports = NodeHelper.create({
  start() {
    this.agent = createProxyAgent();
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "UCL_FETCH_STANDINGS") {
      this.fetchStandings(payload || {});
    }
  },

  async fetchStandings(config) {
    const season = config.season || "2024-25";
    const url = `${DEFAULT_SOURCE}/${season}/cl.txt`;

    try {
      const response = await fetch(url, {
        agent: this.agent,
        headers: {
          "User-Agent": "MMM-UCLStandings/1.0 (+https://github.com/)"
        }
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const text = await response.text();
      const table = parseStandings(text);

      this.sendSocketNotification("UCL_STANDINGS", {
        table,
        fetchedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error(`MMM-UCLStandings: ${error.message}`);
      this.sendSocketNotification("UCL_STANDINGS_ERROR", {
        message: error.message
      });
    }
  }
});

module.exports.parseStandings = parseStandings;
