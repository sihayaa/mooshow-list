const TMDB_API_KEY = "7955446551351299457cc0bd52b20050";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";
const TABLE = "watched_list";
const NO_POSTER = "https://placehold.co/300x450?text=No+Poster";

const TMDB_GENRES = {
    28: ["Action"], 12: ["Adventure"], 16: ["Animation"], 35: ["Comedy"],
    80: ["Crime"], 18: ["Drama"], 14: ["Fantasy"], 27: ["Horror"],
    9648: ["Mystery"], 10749: ["Romance"], 878: ["Sci-Fi"], 53: ["Thriller"],
    10759: ["Action", "Adventure"], 10765: ["Sci-Fi", "Fantasy"]
};

function esc(str) {
    return String(str ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
}



function spawnConfetti(container) {
    if (!container) return;
    const emojis = ["✨", "🌟", "💫", "🎉"];
    for (let i = 0; i < 8; i++) {
        const piece = document.createElement("span");
        piece.className = "confetti-piece";
        piece.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        const angle = Math.random() * Math.PI * 2;
        const dist = 26 + Math.random() * 26;
        piece.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
        piece.style.setProperty("--dy", `${Math.sin(angle) * dist - 12}px`);
        piece.style.animationDelay = `${Math.random() * 80}ms`;
        container.appendChild(piece);
        setTimeout(() => piece.remove(), 950);
    }
}

function spawnFireflies(count = 18) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    for (let i = 0; i < count; i++) {
        const fly = document.createElement("div");
        fly.className = "firefly";
        const size = 3 + Math.random() * 4;
        const duration = 6 + Math.random() * 8;
        const flicker = 2 + Math.random() * 3;
        fly.style.width = `${size}px`;
        fly.style.height = `${size}px`;
        fly.style.top = `${Math.random() * 100}vh`;
        fly.style.left = `${Math.random() * 100}vw`;
        fly.style.animation = `fireflyFloat ${duration}s ease-in-out infinite, fireflyFlicker ${flicker}s ease-in-out infinite`;
        fly.style.animationDelay = `${-Math.random() * duration}s, ${-Math.random() * flicker}s`;
        document.body.appendChild(fly);
    }
}
spawnFireflies();



const type = document.getElementById("type");
const title = document.getElementById("title");
const season = document.getElementById("season");
const episode = document.getElementById("episode");
const addBtn = document.getElementById("addBtn");
const watchlist = document.getElementById("watchlist");
const search = document.getElementById("search");
const historyBtn = document.getElementById("historyBtn");
const pageTitle = document.getElementById("pageTitle");
const filterGenre = document.getElementById("filterGenre");
const sortBy = document.getElementById("sortBy");
const searchResults = document.getElementById("searchResults");
const seasonField = season.parentElement;
const episodeField = episode.parentElement;

let showingWatchlist = false; 
let selectedTMDB = null;
let searchTimeout = null;



const genreBtn = document.getElementById("genreBtn");
const genreBtnLabel = document.getElementById("genreBtnLabel");
const genrePanel = document.getElementById("genrePanel");
const genreOptions = document.querySelectorAll("#genrePanel .genre-option");
let selectedGenres = [];

genreBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    genrePanel.classList.toggle("show");
});

document.addEventListener("click", (e) => {
    if (!genrePanel.contains(e.target) && !genreBtn.contains(e.target)) {
        genrePanel.classList.remove("show");
    }
});

function syncGenres() {
    selectedGenres = Array.from(genreOptions)
        .filter(o => o.classList.contains("selected"))
        .map(o => o.dataset.genre);
    genreBtnLabel.textContent = selectedGenres.length ? selectedGenres.join(", ") : "Select Genres";
}

genreOptions.forEach(opt => {
    opt.addEventListener("click", () => {
        opt.classList.toggle("selected");
        syncGenres();
    });
});

function setGenres(names) {
    genreOptions.forEach(o => o.classList.toggle("selected", names.includes(o.dataset.genre)));
    syncGenres();
}

function genreClass(genre) {
    return `badge-genre-${genre.toLowerCase().replace(/\s+/g, "-")}`;
}

function renderGenreBadges(genreString) {
    return (genreString || "")
        .split(",")
        .map(g => g.trim())
        .filter(Boolean)
        .map(g => `<span class="badge ${genreClass(g)}">${esc(g)}</span>`)
        .join("");
}



function updateFields() {
    const show = type.value !== "Movie";
    seasonField.style.display = show ? "flex" : "none";
    episodeField.style.display = show ? "flex" : "none";
}
type.addEventListener("change", updateFields);
updateFields();



function detectType(item) {
    if (item.media_type === "movie") return "Movie";
    const isAnime =
        (item.genre_ids && item.genre_ids.includes(16)) ||
        item.original_language === "ja";
    return isAnime ? "Anime" : "Series";
}

async function searchTMDB(query) {

    if (query.length < 2) {
        searchResults.style.display = "none";
        searchResults.innerHTML = "";
        return;
    }

    let data;
    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
        );
        data = await response.json();
    } catch (err) {
        console.error("TMDB search error:", err);
        return;
    }


    if (title.value.trim() !== query) return;

    searchResults.innerHTML = "";

    const results = (data.results || []).filter(
        r => r.media_type === "movie" || r.media_type === "tv"
    );

    if (!results.length) {
        searchResults.style.display = "none";
        return;
    }

    results.slice(0, 15).forEach(item => {

        const poster = item.poster_path
            ? `${TMDB_IMAGE}${item.poster_path}`
            : "https://placehold.co/100x150?text=No+Poster";
        const year = (item.release_date || item.first_air_date || "").substring(0, 4);
        const mediaLabel = item.media_type === "movie" ? "Movie" : "TV/Anime";

        const div = document.createElement("div");
        div.className = "search-item";
        div.innerHTML = `
            <img src="${poster}" alt="">
            <div>
                <h4>${esc(item.title || item.name)}</h4>
                <p>${esc(year)} · ${mediaLabel}</p>
            </div>
        `;

        div.onclick = () => {
            selectedTMDB = item;
            title.value = item.title || item.name;
            type.value = detectType(item);

       
            const names = [...new Set((item.genre_ids || []).flatMap(id => TMDB_GENRES[id] || []))];
            setGenres(names);

            updateFields();
            searchResults.style.display = "none";
        };

        searchResults.appendChild(div);
    });

    searchResults.style.display = "block";
}

title.addEventListener("input", () => {
    selectedTMDB = null;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchTMDB(title.value.trim()), 300);
});

document.addEventListener("click", (e) => {
    if (!searchResults.contains(e.target) && e.target !== title) {
        searchResults.style.display = "none";
    }
});



const filterBtn = document.getElementById("filterBtn");
const filterPanel = document.getElementById("filterPanel");
const filterDot = document.getElementById("filterDot");

filterBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    filterPanel.classList.toggle("show");
});

document.addEventListener("click", (e) => {
    if (!filterPanel.contains(e.target) && !filterBtn.contains(e.target)) {
        filterPanel.classList.remove("show");
    }
});

function updateFilterDot() {
    filterDot.classList.toggle("show", filterGenre.value !== "" || sortBy.value !== "created_at");
}

filterGenre.addEventListener("change", () => { updateFilterDot(); loadWatchlist(); });
sortBy.addEventListener("change", () => { updateFilterDot(); loadWatchlist(); });



async function openDetailsModal(item) {

    const modal = document.getElementById("detailsModal");
    const backdropImg = document.getElementById("detailsBackdrop");
    const overviewEl = document.getElementById("detailsOverview");
    const metaEl = document.getElementById("detailsMeta");

    document.getElementById("detailsTitle").textContent = item.title;
    document.getElementById("detailsBadges").innerHTML =
        `<span class="badge">${esc(item.type)}</span>${renderGenreBadges(item.genre)}`;
    overviewEl.textContent = "Loading description...";
    metaEl.textContent = "";
    backdropImg.src = item.poster || NO_POSTER;
    modal.classList.add("show");

    if (!item.tmdb_id) {
        overviewEl.textContent = "No description available.";
        return;
    }

    try {
        const res = await fetch(
            `https://api.themoviedb.org/3/${item.tmdb_type}/${item.tmdb_id}?api_key=${TMDB_API_KEY}`
        );
        const d = await res.json();

        let runtime = null;
        if (item.tmdb_type === "movie" && d.runtime) runtime = `${d.runtime} min`;
        if (item.tmdb_type === "tv" && d.episode_run_time && d.episode_run_time.length) {
            runtime = `${d.episode_run_time[0]} min/ep`;
        }

        if (d.backdrop_path) backdropImg.src = `https://image.tmdb.org/t/p/w1280${d.backdrop_path}`;
        overviewEl.textContent = d.overview || "No description available.";

        metaEl.textContent = [
            (d.release_date || d.first_air_date || "").substring(0, 4),
            d.vote_average ? `⭐ ${d.vote_average.toFixed(1)}` : null,
            runtime
        ].filter(Boolean).join(" · ");

    } catch (err) {
        console.error("TMDB details error:", err);
        overviewEl.textContent = "No description available.";
    }
}

document.getElementById("closeDetails").addEventListener("click", () => {
    document.getElementById("detailsModal").classList.remove("show");
});

document.getElementById("detailsModal").addEventListener("click", (e) => {
    if (e.target.id === "detailsModal") e.currentTarget.classList.remove("show");
});



async function loadWatchlist() {

    let query = supabaseClient
        .from(TABLE)
        .select("*")
        .eq("watched", !showingWatchlist);

    if (filterGenre.value) {
        query = query.ilike("genre", `%${filterGenre.value}%`);
    }

    if (sortBy.value === "title") {
        query = query.order("title", { ascending: true });
    } else {
        query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
        console.error(error);
        return;
    }

    watchlist.innerHTML = "";
    data.forEach((item, index) => watchlist.appendChild(renderCard(item, index)));
    applyTitleSearch();
}

function renderCard(item, index) {

    const card = document.createElement("div");
    card.className = "card";
    card.style.animationDelay = `${Math.min(index, 12) * 60}ms`;
    if (item.watched) card.classList.add("completed");

    const isMovie = item.type === "Movie";

    const progressHTML = isMovie
        ? `<div class="progress">🎬 Movie${item.year ? ` · ${esc(item.year)}` : ""}</div>`
        : `<div class="progress">
               Season: <span class="seasonNumber">${esc(item.season)}</span><br>
               Episode: <span class="episodeNumber">${esc(item.episode)}</span>
           </div>`;

    card.innerHTML = `
<div class="poster-wrapper">
    <img class="poster" src="${esc(item.poster || NO_POSTER)}" alt="${esc(item.title)}" loading="lazy">
    <div class="card-content">
        <div class="card-top">
            ${isMovie ? "" : `<button class="icon-btn edit-btn" title="Edit Progress">✏</button>`}
            <button class="icon-btn delete-btn" title="Delete">✕</button>
        </div>
        <h3>${esc(item.title)}</h3>
        <div class="badges">
            <span class="badge">${esc(item.type)}</span>
            ${renderGenreBadges(item.genre)}
        </div>
        ${progressHTML}
        <label class="complete">
            <input type="checkbox" class="completedCheck" ${item.watched ? "checked" : ""}>
            ${item.watched ? "Watched" : "Mark as watched"}
        </label>
    </div>
</div>
`;


    const checkbox = card.querySelector(".completedCheck");
    checkbox.addEventListener("change", async function () {

        await supabaseClient
            .from(TABLE)
            .update({ watched: this.checked })
            .eq("id", item.id);

        if (this.checked) spawnConfetti(this.closest(".complete"));

        card.classList.add("completing");
        setTimeout(loadWatchlist, 500);
    });

  
    card.querySelector(".delete-btn").addEventListener("click", () => {

        const modal = document.getElementById("deleteModal");
        document.getElementById("deleteText").textContent =
            `Are you sure you want to delete "${item.title}"?`;
        modal.classList.add("show");

        document.getElementById("deleteNo").onclick = () => modal.classList.remove("show");

        document.getElementById("deleteYes").onclick = async () => {
            await supabaseClient.from(TABLE).delete().eq("id", item.id);
            modal.classList.remove("show");
            loadWatchlist();
        };
    });

  
    const editBtn = card.querySelector(".edit-btn");
    if (editBtn) {
        editBtn.addEventListener("click", () => {

            const modal = document.getElementById("progressModal");
            const modalSeason = document.getElementById("modalSeason");
            const modalEpisode = document.getElementById("modalEpisode");

            modalSeason.value = item.season;
            modalEpisode.value = item.episode;
            modal.classList.add("show");

            document.getElementById("cancelModal").onclick = () => modal.classList.remove("show");

            document.getElementById("saveModal").onclick = async () => {
                await supabaseClient
                    .from(TABLE)
                    .update({
                        season: Number(modalSeason.value),
                        episode: Number(modalEpisode.value)
                    })
                    .eq("id", item.id);
                modal.classList.remove("show");
                loadWatchlist();
            };
        });
    }


    [card.querySelector(".poster"), card.querySelector("h3")].forEach(el => {
        el.style.cursor = "pointer";
        el.addEventListener("click", () => openDetailsModal(item));
    });

    return card;
}



async function addItem() {

    const name = title.value.trim();

    if (name === "") {
        alert("Please enter a title.");
        return;
    }

    if (selectedGenres.length === 0) {
        alert("Please select at least one genre.");
        return;
    }


    const match = selectedTMDB;

    if (!match) {
        const ok = confirm(
            "You haven't picked a result from the dropdown, so this will be saved without a poster or details.\n\nSave anyway?"
        );
        if (!ok) {
            searchTMDB(name);
            return;
        }
    }

    const isMovie = type.value === "Movie";

    const newItem = {
        title: name,
        genre: selectedGenres.join(", "),
        type: type.value,
        season: isMovie ? null : Number(season.value),
        episode: isMovie ? null : Number(episode.value),
        watched: !showingWatchlist, 
        tmdb_id: match ? match.id : null,
        tmdb_type: match ? match.media_type : null,
        poster: match && match.poster_path ? `${TMDB_IMAGE}${match.poster_path}` : null,
        year: match ? (match.release_date || match.first_air_date || "").substring(0, 4) : null
    };

    const { error } = await supabaseClient.from(TABLE).insert([newItem]);

    if (error) {
        console.error(error);
        alert("Failed to save item.");
        return;
    }

    title.value = "";
    season.value = 1;
    episode.value = 1;
    selectedTMDB = null;
    setGenres([]);

    loadWatchlist();
}

addBtn.addEventListener("click", addItem);


const WATCHED_TITLE = pageTitle.textContent;
const WATCHED_BTN = historyBtn.textContent;
const WATCHLIST_TITLE = "To Watch or Not to Watch 👀";
const WATCHLIST_BTN = "← Back to Binged 🎞️";

historyBtn.addEventListener("click", () => {

    showingWatchlist = !showingWatchlist;

    historyBtn.textContent = showingWatchlist ? WATCHLIST_BTN : WATCHED_BTN;
    pageTitle.textContent = showingWatchlist ? WATCHLIST_TITLE : WATCHED_TITLE;

    loadWatchlist();
});


function applyTitleSearch() {
    const filter = search.value.toLowerCase();
    document.querySelectorAll(".card").forEach(card => {
        const t = card.querySelector("h3").textContent.toLowerCase();
        card.style.display = t.includes(filter) ? "" : "none";
    });
}

search.addEventListener("input", applyTitleSearch);

document.addEventListener("DOMContentLoaded", loadWatchlist);
