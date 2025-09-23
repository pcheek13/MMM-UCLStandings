/* global Module */

Module.register("MMM-WNBAFeverStats", {
  defaults: {
    favoriteTeamId: "ind",
    favoriteTeamDisplayName: "Indiana Fever",
    updateInterval: 5 * 60 * 1000,
    animationSpeed: 1000,
    maxUpcoming: 3,
    headerText: "Indiana Fever Live Stats"
  },

  start() {
    this.loaded = false;
    this.error = null;
    this.liveGame = null;
    this.upcomingGames = [];
    this.sendSocketNotification("CONFIG", this.config);
  },

  getHeader() {
    return this.config.headerText;
  },

  getStyles() {
    return ["MMM-WNBAFeverStats.css"];
  },

  socketNotificationReceived(notification, payload) {
    if (notification === "GAME_DATA") {
      this.error = null;
      this.loaded = true;
      this.liveGame = payload.liveGame;
      this.upcomingGames = payload.upcomingGames;
      this.updateDom(this.config.animationSpeed);
    } else if (notification === "GAME_ERROR") {
      this.error = payload.message;
      this.loaded = true;
      this.liveGame = null;
      this.upcomingGames = [];
      this.updateDom(this.config.animationSpeed);
    }
  },

  getDom() {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-wnba-fever-stats";

    if (!this.loaded) {
      wrapper.innerHTML = `<div class="loading">Loading ${this.config.favoriteTeamDisplayName} data...</div>`;
      return wrapper;
    }

    if (this.error) {
      wrapper.innerHTML = `<div class="error">${this.translate("ERROR")}: ${this.error}</div>`;
      return wrapper;
    }

    if (this.liveGame) {
      wrapper.appendChild(this.renderLiveGame());
    } else {
      wrapper.appendChild(this.renderUpcoming());
    }

    return wrapper;
  },

  renderLiveGame() {
    const container = document.createElement("div");
    container.className = "live-game";

    const title = document.createElement("div");
    title.className = "section-title";
    const matchup = `${this.config.favoriteTeamDisplayName} ${this.liveGame.teamScore} - ${this.liveGame.opponentScore} ${this.liveGame.opponent}`;
    title.innerHTML = `<span class="status">${this.liveGame.status}</span> <span class="matchup">${matchup}</span>`;
    container.appendChild(title);

    if (this.liveGame.venue) {
      const venue = document.createElement("div");
      venue.className = "venue";
      venue.innerText = `${this.formatDateTime(this.liveGame.startTime)} • ${this.liveGame.venue}`;
      container.appendChild(venue);
    }

    const table = document.createElement("table");
    table.className = "stats-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["Player", "PTS", "REB", "AST", "STL"].forEach((label) => {
      const th = document.createElement("th");
      th.innerText = label;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    (this.liveGame.players || []).forEach((player) => {
      const row = document.createElement("tr");

      const nameCell = document.createElement("td");
      nameCell.className = "player";
      nameCell.innerText = player.name;
      row.appendChild(nameCell);

      const stats = [player.points, player.rebounds, player.assists, player.steals];
      stats.forEach((value) => {
        const td = document.createElement("td");
        td.innerText = value || "-";
        row.appendChild(td);
      });

      tbody.appendChild(row);
    });

    if (!tbody.hasChildNodes()) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.className = "no-data";
      cell.innerText = "Live player stats are not currently available.";
      row.appendChild(cell);
      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    container.appendChild(table);

    return container;
  },

  renderUpcoming() {
    const container = document.createElement("div");
    container.className = "upcoming";

    const title = document.createElement("div");
    title.className = "section-title";
    title.innerText = `No live games. Next ${this.config.favoriteTeamDisplayName} matchups:`;
    container.appendChild(title);

    const list = document.createElement("ul");
    list.className = "upcoming-list";

    if (!this.upcomingGames || this.upcomingGames.length === 0) {
      const li = document.createElement("li");
      li.className = "no-data";
      li.innerText = "No upcoming games found.";
      list.appendChild(li);
    } else {
      this.upcomingGames.slice(0, this.config.maxUpcoming).forEach((game) => {
        const li = document.createElement("li");
        const prefix = game.isHome ? "vs" : "@";
        li.innerHTML = `<span class="opponent">${prefix} ${game.opponent}</span><span class="datetime">${this.formatDateTime(game.date)}</span>`;
        if (game.venue) {
          const venue = document.createElement("div");
          venue.className = "venue";
          venue.innerText = game.venue;
          li.appendChild(venue);
        }
        list.appendChild(li);
      });
    }

    container.appendChild(list);
    return container;
  },

  formatDateTime(dateString) {
    if (!dateString) {
      return "";
    }

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return dateString;
    }

    const options = {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    };

    return date.toLocaleString(undefined, options);
  }
});
