const NodeHelper = require("node_helper");
const fetch = require("node-fetch");
const { HttpsProxyAgent } = require("https-proxy-agent");

const API_BASE_URL = "https://api.football-data.org/v4";
const COMPETITION_CODE = "CL";
const USER_AGENT = "MMM-UCLStandings/2.0 (+https://github.com/pcheek13/MMM-UCLStandings)";
const DEFAULT_MATCH_LIMIT = 3;

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

function buildHeaders(token) {
  return {
    "X-Auth-Token": token,
    "User-Agent": USER_AGENT,
    Accept: "application/json"
  };
}

async function fetchJson(url, token, agent) {
  const response = await fetch(url, {
    agent,
    headers: buildHeaders(token)
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Request failed with status ${response.status}${text ? `: ${text}` : ""}`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function normalizeName(value) {
  return typeof value === "string" ? value.toLowerCase().replace(/\s+/g, " ").trim() : "";
}

function selectStandingsTable(data) {
  if (!data || !Array.isArray(data.standings)) {
    return null;
  }

  const preferred = data.standings.find(
    (standing) =>
      standing &&
      standing.type === "TOTAL" &&
      (standing.stage === "LEAGUE_PHASE" || standing.stage === "REGULAR_SEASON" || standing.group == null)
  );

  return preferred || data.standings[0] || null;
}

function mapTableEntry(entry) {
  return {
    position: entry.position,
    team: entry.team ? entry.team.name : "",
    shortName: entry.team ? entry.team.shortName : null,
    tla: entry.team ? entry.team.tla : null,
    crest: entry.team ? entry.team.crest : null,
    teamId: entry.team ? entry.team.id : null,
    played: entry.playedGames,
    wins: entry.won,
    draws: entry.draw,
    losses: entry.lost,
    goalsFor: entry.goalsFor,
    goalsAgainst: entry.goalsAgainst,
    goalDifference: entry.goalDifference,
    points: entry.points
  };
}

function findFavoriteTeam(table, favoriteName) {
  const normalizedFavorite = normalizeName(favoriteName);
  if (!normalizedFavorite) {
    return null;
  }

  return (
    table.find((entry) => {
      const candidates = [entry.team, entry.shortName, entry.tla].map(normalizeName).filter(Boolean);
      return candidates.some(
        (candidate) =>
          candidate === normalizedFavorite ||
          candidate.includes(normalizedFavorite) ||
          normalizedFavorite.includes(candidate)
      );
    }) || null
  );
}

function buildMatchLocation(match, isHome) {
  if (!match) {
    return "TBD";
  }

  const base = isHome ? "Home" : "Away";
  if (match.venue) {
    return `${base} · ${match.venue}`;
  }
  return base;
}

function mapUpcomingMatches(matches, teamId, limit) {
  if (!Array.isArray(matches) || !teamId) {
    return [];
  }

  return matches.slice(0, limit).map((match) => {
    const isHome = match.homeTeam && match.homeTeam.id === teamId;
    const opponent = isHome ? match.awayTeam : match.homeTeam;
    const opponentName = opponent && opponent.name ? opponent.name : "TBD";

    return {
      id: match.id,
      utcDate: match.utcDate,
      displayOpponent: `${isHome ? "vs" : "@"} ${opponentName}`,
      location: buildMatchLocation(match, isHome)
    };
  });
}

function formatSeasonLabel(season) {
  if (!season) {
    return null;
  }

  const startYear = season.startDate ? Number.parseInt(season.startDate.slice(0, 4), 10) : null;
  const endYear = season.endDate ? Number.parseInt(season.endDate.slice(0, 4), 10) : null;

  if (Number.isInteger(startYear) && Number.isInteger(endYear)) {
    return `${startYear}-${String(endYear).slice(-2)}`;
  }

  if (Number.isInteger(startYear)) {
    return `${startYear}-${String(startYear + 1).slice(-2)}`;
  }

  if (season.currentMatchday) {
    return `Matchday ${season.currentMatchday}`;
  }

  return null;
}

async function fetchUpcomingMatches(teamId, token, agent, limit, season) {
  if (!teamId) {
    return [];
  }

  const params = new URLSearchParams({
    status: "SCHEDULED",
    competitions: COMPETITION_CODE,
    limit: String(Math.max(limit, 1))
  });

  if (season && season !== "latest" && /^\d{4}$/.test(String(season))) {
    params.set("season", String(season));
  }

  const url = `${API_BASE_URL}/teams/${teamId}/matches?${params.toString()}`;
  const data = await fetchJson(url, token, agent);
  return mapUpcomingMatches(data.matches, teamId, limit);
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
    const token = typeof config.apiAuthToken === "string" ? config.apiAuthToken.trim() : "";

    if (!token) {
      this.sendSocketNotification("UCL_STANDINGS_ERROR", {
        message: "Missing apiAuthToken for football-data.org."
      });
      return;
    }

    const season = typeof config.season === "string" && config.season.trim().length > 0 ? config.season.trim() : "latest";
    const limit = Number.isInteger(config.upcomingMatchLimit) && config.upcomingMatchLimit > 0
      ? config.upcomingMatchLimit
      : DEFAULT_MATCH_LIMIT;

    try {
      const standingsUrl = new URL(`${API_BASE_URL}/competitions/${COMPETITION_CODE}/standings`);
      if (season !== "latest" && /^\d{4}$/.test(season)) {
        standingsUrl.searchParams.set("season", season);
      }

      const standingsData = await fetchJson(standingsUrl.toString(), token, this.agent);
      const tableSource = selectStandingsTable(standingsData);

      if (!tableSource || !Array.isArray(tableSource.table)) {
        throw new Error("No standings data returned by football-data.org");
      }

      const table = tableSource.table.map(mapTableEntry);
      const favoriteName = typeof config.favoriteTeam === "string" ? config.favoriteTeam.trim() : "";
      const favoriteTeam = favoriteName ? findFavoriteTeam(table, favoriteName) : null;

      let upcomingMatches = [];
      if (favoriteTeam && favoriteTeam.teamId) {
        try {
          upcomingMatches = await fetchUpcomingMatches(favoriteTeam.teamId, token, this.agent, limit, season);
        } catch (matchError) {
          console.error(`MMM-UCLStandings: Unable to load upcoming matches: ${matchError.message}`);
        }
      }

      const responsePayload = {
        table,
        season: formatSeasonLabel(standingsData.season),
        favoriteTeam: favoriteTeam
          ? { name: favoriteTeam.team, crest: favoriteTeam.crest, teamId: favoriteTeam.teamId }
          : null,
        upcomingMatches
      };

      this.sendSocketNotification("UCL_STANDINGS", responsePayload);
    } catch (error) {
      let message = error && error.message ? error.message : "Unable to load standings";
      if (error.status === 403) {
        message = "football-data.org rejected the request (403). Check your apiAuthToken.";
      } else if (error.status === 429) {
        message = "football-data.org rate limit exceeded. Try again later.";
      }

      console.error(`MMM-UCLStandings: ${message}`);
      this.sendSocketNotification("UCL_STANDINGS_ERROR", { message });
    }
  }
});
