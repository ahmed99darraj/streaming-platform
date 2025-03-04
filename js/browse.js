document.addEventListener('DOMContentLoaded', function() {
  // TMDB API Configuration
  const tmdbBaseUrl = 'https://api.themoviedb.org/3';
  const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
  const imageBaseUrl = 'https://image.tmdb.org/t/p/w500';
  
  // State variables
  let currentPage = 1;
  let contentType = 'movie'; // Default content type: movie or tv
  let selectedGenre = '';
  let sortBy = 'popularity.desc';
  let isLoading = false;
  let totalPages = 0;
  let includeAdult = false; // Default to excluding adult content
  
  // Genre maps to store genre IDs and names
  const movieGenres = {};
  const tvGenres = {};
  
  // DOM elements
  const resultsGrid = document.getElementById('results-grid');
  const loadMoreButton = document.getElementById('load-more-button');
  const loadMoreContainer = document.getElementById('load-more-container');
  const genreSelect = document.getElementById('genre-select');
  const sortSelect = document.getElementById('sort-select');
  const typeButtons = document.querySelectorAll('.filter-button[data-type]');
  const searchInput = document.querySelector('.search-container input');
  const backButton = document.getElementById('back-button');
  const adultFilterCheckbox = document.getElementById('adult-filter');
  
  // Initialize WebsimSocket connection for watchlist functionality
  let room;
  
  if (window.WebsimSocket) {
    room = new WebsimSocket();
  }
  
  // Initialize event listeners and fetch initial data
  function init() {
    // Type filter buttons
    typeButtons.forEach(button => {
      button.addEventListener('click', function() {
        if (!this.classList.contains('active')) {
          typeButtons.forEach(btn => btn.classList.remove('active'));
          this.classList.add('active');
          contentType = this.dataset.type;
          resetAndFetch();
          updateGenreDropdown();
        }
      });
    });
    
    // Genre select
    genreSelect.addEventListener('change', function() {
      selectedGenre = this.value;
      resetAndFetch();
    });
    
    // Sort select
    sortSelect.addEventListener('change', function() {
      sortBy = this.value;
      resetAndFetch();
    });
    
    // Adult filter checkbox
    if (adultFilterCheckbox) {
      adultFilterCheckbox.addEventListener('change', function() {
        includeAdult = this.checked;
        resetAndFetch();
      });
      
      // Load preference from localStorage
      const savedAdultPreference = localStorage.getItem('includeAdult');
      if (savedAdultPreference !== null) {
        includeAdult = savedAdultPreference === 'true';
        adultFilterCheckbox.checked = includeAdult;
      }
    }
    
    // Load more button
    loadMoreButton.addEventListener('click', loadMore);
    
    // Back button
    if (backButton) {
      backButton.addEventListener('click', function() {
        window.location.href = 'index.html';
      });
    }
    
    // Menu item links
    const watchlistMenuItem = document.getElementById('watchlist-menu-item');
    if (watchlistMenuItem) {
      watchlistMenuItem.addEventListener('click', function() {
        window.location.href = 'watchlist.html';
      });
    }
    
    // Search functionality
    if (searchInput) {
      searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          const query = this.value.trim();
          if (query) {
            window.location.href = `search.html?q=${encodeURIComponent(query)}`;
          }
        }
      });
    }
    
    // Load genres for both movies and TV shows
    Promise.all([
      fetchGenres('movie'),
      fetchGenres('tv')
    ]).then(() => {
      updateGenreDropdown();
      fetchContent();
    });
    
    // Setup scroll event for infinite loading
    window.addEventListener('scroll', handleScroll);
  }
  
  // Handle scroll events for infinite loading
  function handleScroll() {
    if (isLoading || currentPage >= totalPages) return;
    
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // If we're near the bottom of the page, load more content
    if (scrollY + viewportHeight >= documentHeight - 300) {
      loadMore();
    }
  }
  
  // Fetch genres for the specified content type
  function fetchGenres(type) {
    return fetch(`${tmdbBaseUrl}/genre/${type}/list?api_key=${apiKey}`)
      .then(response => response.json())
      .then(data => {
        data.genres.forEach(genre => {
          if (type === 'movie') {
            movieGenres[genre.id] = genre.name;
          } else {
            tvGenres[genre.id] = genre.name;
          }
        });
      })
      .catch(error => {
        console.error(`Error fetching ${type} genres:`, error);
      });
  }
  
  // Update the genre dropdown based on the current content type
  function updateGenreDropdown() {
    // Clear current options except the default one
    while (genreSelect.options.length > 1) {
      genreSelect.remove(1);
    }
    
    // Get the appropriate genre map
    const genres = contentType === 'movie' ? movieGenres : tvGenres;
    
    // Add genre options
    Object.entries(genres).forEach(([id, name]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = name;
      genreSelect.appendChild(option);
    });
  }
  
  // Reset state and fetch content
  function resetAndFetch() {
    currentPage = 1;
    resultsGrid.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading content...</p>
      </div>
    `;
    loadMoreContainer.style.display = 'none';
    
    // Save adult preference
    if (adultFilterCheckbox) {
      localStorage.setItem('includeAdult', includeAdult);
    }
    
    fetchContent();
  }
  
  // Fetch content from TMDB API
  function fetchContent() {
    isLoading = true;
    
    // Get the correct API endpoint based on content type
    let apiEndpoint = `${tmdbBaseUrl}/discover/${contentType}?api_key=${apiKey}&page=${currentPage}&sort_by=${sortBy}&include_adult=${includeAdult}`;
    
    // Add genre filter if selected
    if (selectedGenre) {
      apiEndpoint += `&with_genres=${selectedGenre}`;
    }
    
    fetch(apiEndpoint)
      .then(response => response.json())
      .then(data => {
        isLoading = false;
        totalPages = data.total_pages;
        
        // Remove loading spinner if this is the first page
        if (currentPage === 1) {
          resultsGrid.innerHTML = '';
        }
        
        // Process and display results
        displayResults(data.results);
        
        // Show/hide load more button
        loadMoreContainer.style.display = currentPage < totalPages ? 'flex' : 'none';
        loadMoreButton.classList.remove('loading');
        loadMoreButton.innerHTML = 'Load More';
      })
      .catch(error => {
        console.error('Error fetching content:', error);
        isLoading = false;
        
        if (currentPage === 1) {
          resultsGrid.innerHTML = `
            <div class="loading-container">
              <p>Error loading content. Please try again.</p>
              <button class="load-more-button" onclick="resetAndFetch()">Retry</button>
            </div>
          `;
        }
        
        loadMoreButton.classList.remove('loading');
        loadMoreButton.innerHTML = 'Load More';
      });
  }
  
  // Display results in the grid
  function displayResults(results) {
    // If no results
    if (results.length === 0 && currentPage === 1) {
      resultsGrid.innerHTML = `
        <div class="loading-container">
          <p>No content found for your current filters.</p>
        </div>
      `;
      return;
    }
    
    results.forEach(item => {
      // Create container for the item
      const itemContainer = document.createElement('div');
      itemContainer.className = 'movie-item';
      itemContainer.dataset.id = item.id;
      itemContainer.dataset.type = contentType;
      
      // Get item details
      const title = contentType === 'movie' ? item.title : item.name;
      const posterPath = item.poster_path ? `${imageBaseUrl}${item.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image';
      const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
      const year = contentType === 'movie' 
        ? (item.release_date ? new Date(item.release_date).getFullYear() : 'N/A')
        : (item.first_air_date ? new Date(item.first_air_date).getFullYear() : 'N/A');
      
      // Get genre names from IDs
      const genreMap = contentType === 'movie' ? movieGenres : tvGenres;
      const genres = item.genre_ids
        .map(id => genreMap[id])
        .filter(Boolean)
        .slice(0, 3)
        .join(', ');
      
      // Check if item is in watchlist
      const isInWatchlist = isItemInWatchlist(item.id, contentType);
      
      // Construct item HTML
      itemContainer.innerHTML = `
        <div class="movie-poster">
          <img src="${posterPath}" alt="${title}">
          <div class="content-type">${contentType === 'movie' ? 'Movie' : 'TV'}</div>
          <button class="watchlist-button ${isInWatchlist ? 'added' : ''}" data-id="${item.id}" data-type="${contentType}" data-title="${title}">
            <i class="${isInWatchlist ? 'fas' : 'far'} fa-heart"></i>
          </button>
        </div>
        <div class="movie-info">
          <div class="movie-title">${title}</div>
          <div class="movie-meta">
            <div class="movie-year">${year}</div>
            <div class="movie-rating"><i class="fas fa-star"></i> ${rating}</div>
          </div>
          <div class="movie-genres">${genres || 'Genres not available'}</div>
        </div>
      `;
      
      // Add click listener to navigate to movie/show details
      itemContainer.addEventListener('click', function(e) {
        // Don't trigger navigation if the watchlist button was clicked
        if (e.target.closest('.watchlist-button')) return;
        
        if (contentType === 'movie') {
          window.location.href = `movie-view.html?id=${item.id}`;
        } else {
          window.location.href = `tv-view.html?id=${item.id}`;
        }
      });
      
      // Add to grid
      resultsGrid.appendChild(itemContainer);
    });
    
    // Add watchlist button event listeners
    setupWatchlistButtons();
  }
  
  // Load more content
  function loadMore() {
    if (isLoading || currentPage >= totalPages) return;
    
    // Update button to show loading state
    loadMoreButton.classList.add('loading');
    loadMoreButton.innerHTML = '<div class="spinner-small"></div> Loading...';
    
    // Increment page and fetch
    currentPage++;
    fetchContent();
  }
  
  // Setup watchlist buttons
  function setupWatchlistButtons() {
    const watchlistButtons = document.querySelectorAll('.watchlist-button:not(.initialized)');
    
    watchlistButtons.forEach(button => {
      button.classList.add('initialized');
      
      button.addEventListener('click', function(e) {
        e.stopPropagation();
        
        const id = this.dataset.id;
        const type = this.dataset.type;
        const title = this.dataset.title;
        
        if (this.classList.contains('added')) {
          // Remove from watchlist
          removeFromWatchlist(id, type);
          this.classList.remove('added');
          this.innerHTML = '<i class="far fa-heart"></i>';
        } else {
          // Add to watchlist
          addToWatchlist(id, type, title);
          this.classList.add('added');
          this.innerHTML = '<i class="fas fa-heart"></i>';
          
          // Show confirmation notification
          showNotification(`Added "${title}" to your watchlist`);
        }
      });
    });
  }
  
  // Check if item is in watchlist
  function isItemInWatchlist(id, type) {
    // Get watchlist from local storage
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    return watchlist.some(item => item.id === id.toString() && item.type === type);
  }
  
  // Add item to watchlist
  function addToWatchlist(id, type, title) {
    // Get existing watchlist
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    
    // Check if already in watchlist
    if (!watchlist.some(item => item.id === id && item.type === type)) {
      // Get additional details if needed
      const poster = document.querySelector(`.movie-item[data-id="${id}"] .movie-poster img`).src;
      const rating = document.querySelector(`.movie-item[data-id="${id}"] .movie-rating`).textContent;
      const year = document.querySelector(`.movie-item[data-id="${id}"] .movie-year`).textContent;
      
      // Add to watchlist
      watchlist.push({
        id,
        type,
        title,
        poster,
        rating,
        year,
        dateAdded: new Date().toISOString()
      });
      
      // Save to local storage
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
      
      // If using WebsimSocket, persist to room collection
      if (room) {
        room.collection('watchlist').create({
          content_id: id,
          content_type: type,
          title,
          poster_url: poster,
          added_at: new Date().toISOString()
        });
      }
    }
  }
  
  // Remove item from watchlist
  function removeFromWatchlist(id, type) {
    // Get existing watchlist
    let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    
    // Remove the item
    watchlist = watchlist.filter(item => !(item.id === id && item.type === type));
    
    // Save to local storage
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    
    // If using WebsimSocket, remove from room collection
    if (room) {
      // Get all watchlist records
      const watchlistItems = room.collection('watchlist').filter({ content_id: id, content_type: type }).getList();
      
      // Delete each matching record
      watchlistItems.forEach(item => {
        room.collection('watchlist').delete(item.id);
      });
    }
  }
  
  // Show notification
  function showNotification(message) {
    // Check if there's already a notification
    let notification = document.querySelector('.watch-notification');
    
    if (notification) {
      // Remove existing notification
      notification.remove();
    }
    
    // Create new notification
    notification = document.createElement('div');
    notification.className = 'watch-notification';
    notification.innerHTML = `
      <div class="notification-text">
        <i class="fas fa-heart" style="color: var(--primary-color); margin-right: 8px;"></i>
        ${message}
      </div>
    `;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 3000);
  }
  
  // Initialize the page
  init();
});