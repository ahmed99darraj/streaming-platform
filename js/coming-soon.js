document.addEventListener('DOMContentLoaded', function() {
  // TMDB API Configuration
  const tmdbBaseUrl = 'https://api.themoviedb.org/3';
  const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
  const imageBaseUrl = 'https://image.tmdb.org/t/p/w500';
  
  // State variables
  let currentPage = 1;
  let contentType = 'all'; // Default: all, movie, or tv
  let isLoading = false;
  let totalPages = 0;
  
  // Genre maps to store genre IDs and names
  const movieGenres = {};
  const tvGenres = {};
  
  // DOM elements
  const comingSoonGrid = document.getElementById('coming-soon-grid');
  const loadMoreButton = document.getElementById('load-more-button');
  const loadMoreContainer = document.getElementById('load-more-container');
  const typeButtons = document.querySelectorAll('.filter-button[data-type]');
  const searchInput = document.querySelector('.search-container input');
  const backButton = document.getElementById('back-button');
  
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
        }
      });
    });
    
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
    
    // Logo click to go home
    document.querySelector('.logo').addEventListener('click', function() {
      window.location.href = 'index.html';
    });
    
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
  
  // Reset state and fetch content
  function resetAndFetch() {
    currentPage = 1;
    comingSoonGrid.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading upcoming releases...</p>
      </div>
    `;
    loadMoreContainer.style.display = 'none';
    
    fetchContent();
  }
  
  // Fetch content from TMDB API - will merge movies and TV shows for 'all' type
  function fetchContent() {
    isLoading = true;
    
    // Fetch movies, TV shows, or both based on content type
    const fetchPromises = [];
    
    if (contentType === 'all' || contentType === 'movie') {
      fetchPromises.push(
        fetch(`${tmdbBaseUrl}/movie/upcoming?api_key=${apiKey}&page=${currentPage}`)
          .then(response => response.json())
          .then(data => {
            // Add type to each result
            data.results = data.results.map(item => ({...item, media_type: 'movie'}));
            return data;
          })
      );
    }
    
    if (contentType === 'all' || contentType === 'tv') {
      const today = new Date().toISOString().split('T')[0];
      // Get TV shows releasing in the next 90 days
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 90);
      const futureDateStr = futureDate.toISOString().split('T')[0];
      
      fetchPromises.push(
        fetch(`${tmdbBaseUrl}/discover/tv?api_key=${apiKey}&page=${currentPage}&first_air_date.gte=${today}&first_air_date.lte=${futureDateStr}&sort_by=first_air_date.asc`)
          .then(response => response.json())
          .then(data => {
            // Add type to each result
            data.results = data.results.map(item => ({...item, media_type: 'tv'}));
            return data;
          })
      );
    }
    
    Promise.all(fetchPromises)
      .then(dataArray => {
        isLoading = false;
        
        // Combine results
        let combinedResults = [];
        
        dataArray.forEach(data => {
          combinedResults = [...combinedResults, ...data.results];
          totalPages = Math.max(totalPages, data.total_pages);
        });
        
        // Sort by release date (movies) or first air date (TV shows)
        combinedResults.sort((a, b) => {
          const dateA = a.media_type === 'movie' ? a.release_date : a.first_air_date;
          const dateB = b.media_type === 'movie' ? b.release_date : b.first_air_date;
          return new Date(dateA) - new Date(dateB);
        });
        
        // Remove loading spinner if this is the first page
        if (currentPage === 1) {
          comingSoonGrid.innerHTML = '';
        }
        
        // Process and display results
        displayResults(combinedResults);
        
        // Show/hide load more button
        loadMoreContainer.style.display = currentPage < totalPages ? 'flex' : 'none';
        loadMoreButton.classList.remove('loading');
        loadMoreButton.innerHTML = 'Load More';
      })
      .catch(error => {
        console.error('Error fetching content:', error);
        isLoading = false;
        
        if (currentPage === 1) {
          comingSoonGrid.innerHTML = `
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
      comingSoonGrid.innerHTML = `
        <div class="loading-container">
          <p>No upcoming releases found for your selection.</p>
        </div>
      `;
      return;
    }
    
    results.forEach(item => {
      // Skip items without a release/air date or poster
      if ((!item.release_date && !item.first_air_date) || !item.poster_path) return;
      
      // Create container for the item
      const itemContainer = document.createElement('div');
      itemContainer.className = 'movie-item';
      itemContainer.dataset.id = item.id;
      itemContainer.dataset.type = item.media_type;
      
      // Get item details
      const type = item.media_type;
      const title = type === 'movie' ? item.title : item.name;
      const posterPath = item.poster_path ? `${imageBaseUrl}${item.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image';
      const releaseDate = type === 'movie' ? item.release_date : item.first_air_date;
      
      // Format release date
      const formattedDate = new Date(releaseDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Get days until release
      const daysUntil = getDaysUntilRelease(releaseDate);
      let daysUntilText = '';
      
      if (daysUntil === 0) {
        daysUntilText = 'Releases Today!';
      } else if (daysUntil > 0) {
        daysUntilText = `${daysUntil} days until release`;
      } else {
        daysUntilText = 'Now Available';
      }
      
      // Get genre names from IDs
      const genreMap = type === 'movie' ? movieGenres : tvGenres;
      const genres = item.genre_ids
        .map(id => genreMap[id])
        .filter(Boolean)
        .slice(0, 3)
        .join(', ');
      
      // Construct item HTML
      itemContainer.innerHTML = `
        <div class="movie-poster">
          <img src="${posterPath}" alt="${title}">
          <div class="content-type">${type === 'movie' ? 'Movie' : 'TV'}</div>
          <button class="interest-btn" data-id="${item.id}" data-type="${type}" data-title="${title}">
            <i class="far fa-bell"></i>
          </button>
          <div class="release-date-badge">
            ${formattedDate}
          </div>
          ${daysUntil > 0 && daysUntil <= 30 ? `<div class="countdown-label">${daysUntilText}</div>` : ''}
        </div>
        <div class="movie-info">
          <div class="movie-title">${title}</div>
          <div class="movie-meta">
            <div class="movie-year">${releaseDate ? releaseDate.split('-')[0] : 'TBA'}</div>
          </div>
          <div class="movie-genres">${genres || 'Genres not available'}</div>
        </div>
      `;
      
      // Add click listener to navigate to movie/show details
      itemContainer.addEventListener('click', function(e) {
        // Don't trigger navigation if the interest button was clicked
        if (e.target.closest('.interest-btn')) return;
        
        if (type === 'movie') {
          window.location.href = `movie-view.html?id=${item.id}`;
        } else {
          window.location.href = `tv-view.html?id=${item.id}`;
        }
      });
      
      // Add to grid
      comingSoonGrid.appendChild(itemContainer);
    });
    
    // Setup interest buttons
    setupInterestButtons();
  }
  
  // Calculate days until release
  function getDaysUntilRelease(releaseDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const release = new Date(releaseDate);
    release.setHours(0, 0, 0, 0);
    
    const diffTime = release - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }
  
  // Setup interest notification buttons
  function setupInterestButtons() {
    const interestButtons = document.querySelectorAll('.interest-btn:not(.initialized)');
    
    interestButtons.forEach(button => {
      button.classList.add('initialized');
      
      // Check if already interested (could use localStorage for this)
      const isInterested = false; // Replace with actual check
      
      if (isInterested) {
        button.innerHTML = '<i class="fas fa-bell"></i>';
        button.classList.add('added');
      }
      
      button.addEventListener('click', function(e) {
        e.stopPropagation();
        
        const title = this.dataset.title;
        
        if (this.classList.contains('added')) {
          // Remove interest
          this.innerHTML = '<i class="far fa-bell"></i>';
          this.classList.remove('added');
          showNotification(`Notifications removed for "${title}"`);
        } else {
          // Add interest
          this.innerHTML = '<i class="fas fa-bell"></i>';
          this.classList.add('added');
          showNotification(`You'll be notified when "${title}" is released`);
        }
      });
    });
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
        <i class="fas fa-bell" style="color: var(--primary-color); margin-right: 8px;"></i>
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