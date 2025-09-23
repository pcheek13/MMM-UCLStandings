const NodeHelper = require("node_helper");
const fetch = require("node-fetch");

module.exports = NodeHelper.create({
  start() {
    this.config = null;
    this.updateTimer = null;
  },

  stop() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "CONFIG") {
      this.config = payload;
      this.fetchGameData();
      this.scheduleUpdates();
    }
  },

  scheduleUpdates() {
    if (!this.config) {
      return;
    }

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    const interval = Math.max(parseInt(this.config.updateInterval, 10) || (5 * 60 * 1000), 60 * 1000);
    this.updateTimer = setInterval(() => {
      this.fetchGameData();
    }, interval);
  },

  async fetchGameData() {
    if (!this.config) {
      return;
    }

    try {
      const scheduleUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/teams/${this.config.favoriteTeamId}/schedule`;
      const schedule = await this.fetchJson(scheduleUrl);
      const events = Array.isArray(schedule.events) ? schedule.events : [];

      const now = new Date();
      let liveEvent = null;
      const upcomingEvents = [];

      events.forEach((event) => {
        const competition = event.competitions && event.competitions[0];
        if (!competition) {
          return;
        }

        const status = competition.status && competition.status.type && competition.status.type.state;
        const eventDate = event.date ? new Date(event.date) : null;

        if (status === "in" && !liveEvent) {
          liveEvent = event;
        } else if (status === "pre" && eventDate && eventDate >= now) {
          upcomingEvents.push(event);
        }
      });

    const formattedUpcoming = upcomingEvents
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, this.config.maxUpcoming || 3)
      .map((event) => this.formatUpcoming(event))
      .filter(Boolean);

      let liveGame = null;
      if (liveEvent) {
        liveGame = await this.buildLiveGame(liveEvent);
      }

      this.sendSocketNotification("GAME_DATA", {
        liveGame,
        upcomingGames: formattedUpcoming
      });
    } catch (error) {
      this.sendSocketNotification("GAME_ERROR", { message: error.message });
    }
  },

  async buildLiveGame(event) {
    const competition = event.competitions && event.competitions[0];
    if (!competition) {
      return null;
    }

    const summaryUrl = `https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/summary?event=${event.id}`;
    const summary = await this.fetchJson(summaryUrl);
    const favorite = this.findFavoriteCompetitor(competition);
    const opponent = this.findOpponent(competition, favorite);
    const venue = competition.venue && (competition.venue.fullName || competition.venue.displayName);

    const players = this.extractPlayerStats(summary.boxscore && summary.boxscore.players, this.config.favoriteTeamId);

    return {
      eventId: event.id,
      status: (competition.status && (competition.status.type && (competition.status.type.detail || competition.status.type.shortDetail)))
        || (event.status && event.status.type && event.status.type.detail)
        || "Live",
      startTime: event.date,
      teamScore: favorite && favorite.score ? favorite.score : "0",
      opponentScore: opponent && opponent.score ? opponent.score : "0",
      opponent: opponent && opponent.team ? (opponent.team.displayName || opponent.team.shortDisplayName || opponent.team.name) : "Opponent",
      venue: venue || "",
      players
    };
  },

  extractPlayerStats(playersData, favoriteTeamId) {
    if (!Array.isArray(playersData)) {
      return [];
    }

    const target = (favoriteTeamId || "").toLowerCase();

    const teamEntry = playersData.find((entry) => {
      const team = entry.team || {};
      const candidates = [team.abbreviation, team.shortDisplayName, team.displayName, team.slug, team.id, team.uid];
      return candidates
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .includes(target);
    });

    if (!teamEntry || !Array.isArray(teamEntry.statistics)) {
      return [];
    }

    const statsEntry = teamEntry.statistics.find((stat) => Array.isArray(stat.athletes));
    if (!statsEntry || !Array.isArray(statsEntry.athletes)) {
      return [];
    }

    const labels = Array.isArray(statsEntry.labels) ? statsEntry.labels : [];

    return statsEntry.athletes.map((athlete) => {
      const statLine = this.mapStats(labels, athlete.stats);
      const info = athlete.athlete || {};
      return {
        id: info.id,
        name: info.displayName || info.shortName || "Unknown",
        position: info.position && info.position.abbreviation,
        points: statLine.PTS || statLine.Points || "",
        rebounds: statLine.REB || statLine.Rebounds || "",
        assists: statLine.AST || statLine.Assists || "",
        steals: statLine.STL || statLine.Steals || ""
      };
    });
  },

  mapStats(labels, stats) {
    const result = {};
    if (!Array.isArray(labels) || !Array.isArray(stats)) {
      return result;
    }

    labels.forEach((label, index) => {
      result[label] = stats[index];
    });

    return result;
  },

  formatUpcoming(event) {
    const competition = event.competitions && event.competitions[0];
    if (!competition) {
      return null;
    }

    const favorite = this.findFavoriteCompetitor(competition);
    const opponent = this.findOpponent(competition, favorite);
    const venue = competition.venue && (competition.venue.fullName || competition.venue.displayName);

    return {
      id: event.id,
      date: event.date,
      opponent: opponent && opponent.team ? (opponent.team.displayName || opponent.team.shortDisplayName || opponent.team.name) : "Opponent",
      venue: venue || "",
      isHome: favorite ? favorite.homeAway === "home" : false
    };
  },

  findFavoriteCompetitor(competition) {
    const competitors = Array.isArray(competition.competitors) ? competition.competitors : [];
    const target = (this.config.favoriteTeamId || "").toLowerCase();

    return competitors.find((competitor) => {
      if (!competitor.team) {
        return false;
      }

      const team = competitor.team;
      const candidates = [team.abbreviation, team.shortDisplayName, team.displayName, team.slug, team.id, team.uid];
      return candidates
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .includes(target);
    }) || competitors[0];
  },

  findOpponent(competition, favorite) {
    const competitors = Array.isArray(competition.competitors) ? competition.competitors : [];
    if (!favorite) {
      return competitors[1] || competitors[0] || null;
    }

    return competitors.find((competitor) => competitor !== favorite) || null;
  },

  async fetchJson(url) {
    const response = await fetch(url, { headers: { "User-Agent": "MagicMirror-Module" } });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
  }
});
