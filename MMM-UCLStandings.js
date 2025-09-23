/* global Module */

Module.register("MMM-UCLStandings", {
  defaults: {
    updateInterval: 30 * 60 * 1000,
    animationSpeed: 1000,
    maxRows: 10,
    showHeader: true,
    season: "latest",
    favoriteTeam: "Arsenal",
    favoriteTeamLogoUrl: null,
    apiAuthToken: "",
    showUpcomingMatches: true,
    upcomingMatchLimit: 3
  },

  start() {
    this.table = [];
    this.loaded = false;
    this.error = null;
    this.updateTimer = null;
    this.favoriteTeamName = null;
    this.favoriteTeamNormalized = null;
    this.favoriteTeamLogoUrl = null;
    this.displaySeason = null;
    this.favoriteTeamId = null;
    this.favoriteUpcomingMatches = [];

    this.setFavoriteTeamData();
    this.scheduleUpdate(0);
  },

  setFavoriteTeamData() {
    if (typeof this.config.favoriteTeam === "string") {
      const trimmed = this.config.favoriteTeam.trim();
      if (trimmed.length > 0) {
        this.favoriteTeamName = trimmed;
        this.favoriteTeamNormalized = trimmed.toLowerCase();
      }
    }

    if (!this.favoriteTeamName) {
      this.favoriteTeamName = null;
      this.favoriteTeamNormalized = null;
    }

    if (typeof this.config.favoriteTeamLogoUrl === "string" && this.config.favoriteTeamLogoUrl.trim().length > 0) {
      this.favoriteTeamLogoUrl = this.config.favoriteTeamLogoUrl.trim();
    }
  },

  getStyles() {
    return ["MMM-UCLStandings.css"];
  },

  scheduleUpdate(delay) {
    const nextLoad = typeof delay === "number" && delay >= 0 ? delay : this.config.updateInterval;
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }

    this.updateTimer = setTimeout(() => {
      this.sendSocketNotification("UCL_FETCH_STANDINGS", {
        season: this.config.season,
        favoriteTeam: this.favoriteTeamName || this.config.favoriteTeam,
        apiAuthToken:
          typeof this.config.apiAuthToken === "string" ? this.config.apiAuthToken.trim() : "",
        upcomingMatchLimit:
          typeof this.config.upcomingMatchLimit === "number" && this.config.upcomingMatchLimit > 0
            ? Math.floor(this.config.upcomingMatchLimit)
            : this.defaults.upcomingMatchLimit
      });
    }, nextLoad);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "UCL_STANDINGS") {
      this.table = payload.table || [];
      this.displaySeason = payload.season || null;
      this.favoriteTeamId = payload.favoriteTeam && payload.favoriteTeam.teamId ? payload.favoriteTeam.teamId : null;

      if (payload.favoriteTeam && payload.favoriteTeam.name) {
        this.favoriteTeamName = payload.favoriteTeam.name;
        this.favoriteTeamNormalized = payload.favoriteTeam.name.toLowerCase();
      }

      if (!this.config.favoriteTeamLogoUrl && payload.favoriteTeam && payload.favoriteTeam.crest) {
        this.favoriteTeamLogoUrl = payload.favoriteTeam.crest;
      }

      this.favoriteUpcomingMatches = Array.isArray(payload.upcomingMatches) ? payload.upcomingMatches : [];
      this.loaded = true;
      this.error = null;
      this.updateDom(this.config.animationSpeed);
      this.scheduleUpdate(this.config.updateInterval);
    } else if (notification === "UCL_STANDINGS_ERROR") {
      this.error = payload && payload.message ? payload.message : this.translate("MODULE_ERROR");
      this.updateDom(this.config.animationSpeed);
      this.scheduleUpdate(this.config.updateInterval);
    }
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "ucl-standings";

    if (this.error) {
      const errorMessage = document.createElement("div");
      errorMessage.className = "small bright";
      errorMessage.textContent = `Error loading standings: ${this.error}`;
      wrapper.appendChild(errorMessage);
      return wrapper;
    }

    if (!this.loaded) {
      const loading = document.createElement("div");
      loading.className = "small dimmed";
      loading.textContent = "Loading UEFA Champions League standings…";
      wrapper.appendChild(loading);
      return wrapper;
    }

    if (!this.table || this.table.length === 0) {
      const empty = document.createElement("div");
      empty.className = "small dimmed";
      empty.textContent = "No standings data available.";
      wrapper.appendChild(empty);
      return wrapper;
    }

    if (this.favoriteTeamName) {
      const favoriteWrapper = document.createElement("div");
      favoriteWrapper.className = "ucl-favorite";

      if (this.favoriteTeamLogoUrl) {
        const logo = document.createElement("img");
        logo.className = "ucl-favorite-logo";
        logo.src = this.favoriteTeamLogoUrl;
        logo.alt = `${this.favoriteTeamName} logo`;
        favoriteWrapper.appendChild(logo);
      }

      const name = document.createElement("div");
      name.className = "ucl-favorite-name medium bright";
      name.textContent = this.favoriteTeamName;
      favoriteWrapper.appendChild(name);

      wrapper.appendChild(favoriteWrapper);
    }

    if (this.config.showHeader) {
      const title = document.createElement("div");
      title.className = "ucl-header bright";
      const seasonLabel = this.displaySeason || (this.config.season !== "latest" ? this.config.season : "");
      title.textContent = seasonLabel
        ? `UEFA Champions League Table (${seasonLabel})`
        : "UEFA Champions League Table";
      wrapper.appendChild(title);
    }

    const table = document.createElement("table");
    table.className = "ucl-table small";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const columns = [
      { key: "position", label: "#" },
      { key: "team", label: "Team" },
      { key: "played", label: "P" },
      { key: "wins", label: "W" },
      { key: "draws", label: "D" },
      { key: "losses", label: "L" },
      { key: "goalsFor", label: "GF" },
      { key: "goalsAgainst", label: "GA" },
      { key: "goalDifference", label: "GD" },
      { key: "points", label: "Pts" }
    ];

    columns.forEach((column) => {
      const cell = document.createElement("th");
      cell.textContent = column.label;
      headerRow.appendChild(cell);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const limit = typeof this.config.maxRows === "number" && this.config.maxRows > 0 ? this.config.maxRows : this.table.length;
    const rows = [];

    this.table.forEach((entry) => {
      const isFavorite = this.isFavoriteTeam(entry);
      if (rows.length < limit || isFavorite) {
        rows.push(entry);
      }
    });

    rows
      .sort((a, b) => a.position - b.position)
      .forEach((entry) => {
        const row = document.createElement("tr");
        columns.forEach((column) => {
          const cell = document.createElement("td");
          let value = entry[column.key];

          if (column.key === "team") {
            cell.classList.add("team");
            const wrapper = document.createElement("div");
            wrapper.className = "ucl-team";

            if (entry.crest) {
              const crest = document.createElement("img");
              crest.className = "ucl-team-logo";
              crest.src = entry.crest;
              crest.alt = `${value} crest`;
              wrapper.appendChild(crest);
            }

            const nameElement = this.createTeamNameElement(value, entry);
            wrapper.appendChild(nameElement);

            cell.appendChild(wrapper);
          } else {
            if (column.key === "goalDifference" && typeof value === "number") {
              value = value > 0 ? `+${value}` : `${value}`;
            }
            cell.textContent = value;
          }

          if (column.key === "position") {
            cell.classList.add("position");
          }

          row.appendChild(cell);
        });
        tbody.appendChild(row);
      });

    table.appendChild(tbody);
    wrapper.appendChild(table);

    if (this.favoriteUpcomingMatches.length > 0 && this.config.showUpcomingMatches !== false) {
      const matchesWrapper = document.createElement("div");
      matchesWrapper.className = "ucl-upcoming";

      const title = document.createElement("div");
      title.className = "ucl-upcoming-title medium bright";
      title.textContent = `Next ${this.favoriteUpcomingMatches.length === 1 ? "Match" : "Matches"}`;
      matchesWrapper.appendChild(title);

      const list = document.createElement("ul");
      list.className = "ucl-upcoming-list";

      this.favoriteUpcomingMatches.forEach((match) => {
        const item = document.createElement("li");
        item.className = "ucl-upcoming-item";

        const opponent = document.createElement("span");
        opponent.className = "ucl-upcoming-opponent";
        opponent.textContent = match.displayOpponent;

        const date = document.createElement("span");
        date.className = "ucl-upcoming-date";
        date.textContent = this.formatMatchDate(match.utcDate);

        const location = document.createElement("span");
        location.className = "ucl-upcoming-location dimmed";
        location.textContent = match.location;

        item.appendChild(opponent);
        item.appendChild(date);
        item.appendChild(location);
        list.appendChild(item);
      });

      matchesWrapper.appendChild(list);
      wrapper.appendChild(matchesWrapper);
    }

    return wrapper;
  },

  isFavoriteTeam(entry) {
    if (!entry) {
      return false;
    }

    if (this.favoriteTeamId && entry.teamId === this.favoriteTeamId) {
      return true;
    }

    if (this.favoriteTeamNormalized && typeof entry.team === "string") {
      const normalizedTeam = entry.team.toLowerCase();
      if (normalizedTeam === this.favoriteTeamNormalized) {
        return true;
      }
      if (entry.shortName && entry.shortName.toLowerCase() === this.favoriteTeamNormalized) {
        return true;
      }
      if (entry.tla && entry.tla.toLowerCase() === this.favoriteTeamNormalized) {
        return true;
      }
      return (
        normalizedTeam.includes(this.favoriteTeamNormalized) ||
        this.favoriteTeamNormalized.includes(normalizedTeam)
      );
    }

    return false;
  },

  createTeamNameElement(value, entry) {
    const name = typeof value === "string" ? value : String(value || "");
    const isFavorite = this.isFavoriteTeam(entry);

    if (isFavorite) {
      const strong = document.createElement("strong");
      strong.textContent = name;
      return strong;
    }

    const span = document.createElement("span");
    span.textContent = name;
    return span;
  },

  formatMatchDate(isoString) {
    if (!isoString) {
      return "TBD";
    }

    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) {
      return isoString;
    }

    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
});
