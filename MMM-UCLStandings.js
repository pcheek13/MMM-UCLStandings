/* global Module */

Module.register("MMM-UCLStandings", {
  defaults: {
    updateInterval: 30 * 60 * 1000,
    animationSpeed: 1000,
    maxRows: 12,
    showHeader: true,
    season: "2024-25",
    favoriteTeam: "Arsenal",
    favoriteTeamLogoUrl: null,
    teamLogos: {
      arsenal: "https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg"
    }
  },

  start() {
    this.table = [];
    this.lastUpdated = null;
    this.loaded = false;
    this.error = null;
    this.updateTimer = null;
    this.favoriteTeamName = null;
    this.favoriteTeamNormalized = null;
    this.favoriteTeamLogoUrl = null;

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

    const logoMap = this.config.teamLogos || {};

    if (this.favoriteTeamNormalized) {
      if (typeof this.config.favoriteTeamLogoUrl === "string" && this.config.favoriteTeamLogoUrl.trim().length > 0) {
        this.favoriteTeamLogoUrl = this.config.favoriteTeamLogoUrl.trim();
      } else {
        this.favoriteTeamLogoUrl = logoMap[this.favoriteTeamNormalized] || null;

        if (!this.favoriteTeamLogoUrl) {
          const normalizedKeys = Object.keys(logoMap);
          const matchKey = normalizedKeys.find(
            (key) =>
              key === this.favoriteTeamNormalized ||
              key.includes(this.favoriteTeamNormalized) ||
              this.favoriteTeamNormalized.includes(key)
          );

          if (matchKey) {
            this.favoriteTeamLogoUrl = logoMap[matchKey];
          }
        }
      }
    } else {
      this.favoriteTeamLogoUrl = null;
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
        updateInterval: this.config.updateInterval,
        season: this.config.season
      });
    }, nextLoad);
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "UCL_STANDINGS") {
      this.table = payload.table || [];
      this.lastUpdated = payload.fetchedAt || null;
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
      title.textContent = "UEFA Champions League Table";
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
    const rows = this.config.maxRows ? this.table.slice(0, this.config.maxRows) : this.table;

    rows.forEach((entry) => {
      const row = document.createElement("tr");
      columns.forEach((column) => {
        const cell = document.createElement("td");
        let value = entry[column.key];

        if (column.key === "team") {
          cell.classList.add("team");
          if (typeof value === "string") {
            const normalizedTeam = value.toLowerCase();
            const isFavorite =
              this.favoriteTeamNormalized &&
              (normalizedTeam === this.favoriteTeamNormalized ||
                normalizedTeam.includes(this.favoriteTeamNormalized) ||
                this.favoriteTeamNormalized.includes(normalizedTeam));
            const isDefaultArsenal = !this.favoriteTeamNormalized && normalizedTeam.includes("arsenal");

            if (isFavorite || isDefaultArsenal) {
              const bold = document.createElement("strong");
              bold.textContent = value;
              cell.appendChild(bold);
            } else {
              cell.textContent = value;
            }
          } else {
            cell.textContent = value;
          }
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

    if (this.lastUpdated) {
      const updated = document.createElement("div");
      updated.className = "updated small dimmed";
      const date = new Date(this.lastUpdated);
      updated.textContent = `Last updated: ${date.toLocaleString()}`;
      wrapper.appendChild(updated);
    }

    return wrapper;
  }
});
