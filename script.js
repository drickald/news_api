import { API_KEY } from "./config.js";

// DOM Elements
const searchInput = document.getElementById("searchInput");
const categorySelect = document.getElementById("categorySelect");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");
const results = document.getElementById("results");
const errorDiv = document.getElementById("error");
const loading = document.getElementById("loading");
const pageInfo = document.getElementById("pageInfo");
const pageNumber = document.getElementById("pageNumber");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const themeButtons = document.querySelectorAll(".theme-btn");

// State
let currentPage = 1;
let currentQuery = "";
let currentCategory = "";
let totalResults = 0;
const pageSize = 9;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  setupEventListeners();
  loadDefaultNews();
});

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  searchBtn.addEventListener("click", handleSearch);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSearch();
  });
  clearBtn.addEventListener("click", handleClear);
  prevBtn.addEventListener("click", handlePrevPage);
  nextBtn.addEventListener("click", handleNextPage);
  categorySelect.addEventListener("change", handleCategoryChange);
  themeButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => changeTheme(e.target.dataset.theme));
  });
}

/**
 * Initialize theme from localStorage
 */
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  changeTheme(savedTheme);
}

/**
 * Change application theme
 */
function changeTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);

  themeButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === theme);
  });
}

/**
 * Load default news on page load
 */
function loadDefaultNews() {
  currentQuery = "";
  currentCategory = "";
  currentPage = 1;
  fetchNews();
}

/**
 * Handle search action
 */
function handleSearch() {
  currentQuery = searchInput.value.trim();
  currentCategory = categorySelect.value;

  // Validation: require at least a search term
  if (!currentQuery) {
    showError("Please enter a search term.");
    return;
  }

  // Minimum 2 characters
  if (currentQuery.length < 2) {
    showError("Search term must be at least 2 characters.");
    return;
  }

  currentPage = 1;
  clearError();
  fetchNews();
}

/**
 * Handle category change
 */
function handleCategoryChange() {
  currentCategory = categorySelect.value;
  currentQuery = searchInput.value.trim();

  // Always fetch when category changes (including All Categories)
  currentPage = 1;
  clearError();
  fetchNews();
}

/**
 * Handle clear filters
 */
function handleClear() {
  searchInput.value = "";
  categorySelect.value = "";
  currentQuery = "";
  currentCategory = "";
  currentPage = 1;
  clearError();
  fetchNews();
}

/**
 * Handle previous page
 */
function handlePrevPage() {
  if (currentPage > 1) {
    currentPage--;
    fetchNews();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

/**
 * Handle next page
 */
function handleNextPage() {
  if (hasMorePages()) {
    currentPage++;
    fetchNews();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

/**
 * Check if more pages are available
 */
function hasMorePages() {
  return currentPage * pageSize < totalResults;
}

/**
 * Update pagination buttons
 */
function updatePaginationButtons() {
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = !hasMorePages();
  pageNumber.textContent = currentPage;
  // Cap at 100 since API only allows access to first 100 articles
  const accessibleTotal = Math.min(totalResults, 100);
  pageInfo.textContent = `Page ${currentPage} (Total available: ${accessibleTotal} articles)`;
}

/**
 * Fetch news from API
 */
async function fetchNews() {
  try {
    showLoading(true);
    clearError();

    let url = "";

    // Determine which endpoint to use
    if (currentQuery) {
      // Using /everything endpoint for keyword search - search in title and description only
      url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(currentQuery)}&searchIn=title,description&pageSize=${pageSize}&page=${currentPage}&sortBy=publishedAt&apiKey=${API_KEY}`;
    } else if (currentCategory) {
      // Using /top-headlines endpoint for category (doesn't support sortBy)
      url = `https://newsapi.org/v2/top-headlines?category=${currentCategory}&pageSize=${pageSize}&page=${currentPage}&apiKey=${API_KEY}`;
    } else {
      // Default: use everything endpoint for latest articles (supports more results)
      url = `https://newsapi.org/v2/everything?q=latest&pageSize=${pageSize}&page=${currentPage}&sortBy=publishedAt&apiKey=${API_KEY}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== "ok") {
      throw new Error(data.message || "Failed to fetch news");
    }

    if (data.articles.length === 0) {
      showError("No articles found. Try a different search or category.");
      results.innerHTML = "";
      totalResults = 0;
      updatePaginationButtons();
      return;
    }

    totalResults = data.totalResults;
    displayNews(data.articles);
    updatePaginationButtons();
  } catch (error) {
    console.error("Error fetching news:", error);
    showError(
      error.message || "Failed to fetch news. Please try again later."
    );
  } finally {
    showLoading(false);
  }
}

/**
 * Display articles in results container
 */
function displayNews(articles) {
  results.innerHTML = "";

  articles.forEach((article, index) => {
    const card = createNewsCard(article);
    results.appendChild(card);
    // Stagger animation
    card.style.animationDelay = `${index * 0.05}s`;
  });
}

/**
 * Create a news card element
 */
function createNewsCard(article) {
  const card = document.createElement("div");
  card.className = "news-card";

  const imageUrl =
    article.urlToImage || "https://via.placeholder.com/400x200?text=No+Image";
  const source = article.source.name || "Unknown Source";
  const date = new Date(article.publishedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  card.innerHTML = `
    <img src="${imageUrl}" alt="${article.title}" class="news-card-image" onerror="this.src='https://via.placeholder.com/400x200?text=No+Image'">
    <div class="news-card-content">
      <div class="news-card-source">${source}</div>
      <h3 class="news-card-title">${escapeHtml(article.title)}</h3>
      <p class="news-card-description">${escapeHtml(
        article.description || "No description available"
      )}</p>
      <div class="news-card-meta">
        <span class="news-card-date">📅 ${date}</span>
        <span>${
          article.author ? `by ${article.author.substring(0, 20)}...` : ""
        }</span>
      </div>
      <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="news-card-readmore">Read Full Article →</a>
    </div>
  `;

  return card;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Show error message
 */
function showError(message) {
  errorDiv.textContent = message;
  errorDiv.classList.add("show");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Clear error message
 */
function clearError() {
  errorDiv.textContent = "";
  errorDiv.classList.remove("show");
}

/**
 * Show/hide loading indicator
 */
function showLoading(show) {
  if (show) {
    loading.classList.add("show");
  } else {
    loading.classList.remove("show");
  }
}
