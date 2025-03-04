document.addEventListener('DOMContentLoaded', function() {
  // Get username from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const username = urlParams.get('username');
  
  if (!username) {
    // If no username is provided, redirect back to home
    window.location.href = 'index.html';
    return;
  }
  
  // TMDB API Configuration
  const tmdbBaseUrl = 'https://api.themoviedb.org/3';
  const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
  const posterBaseUrl = 'https://image.tmdb.org/t/p/w500';
  
  // State variables
  let currentPage = 1;
  let totalPages = 0;
  let isLoading = false;
  
  // Initialize WebsimSocket connection
  let room = new WebsimSocket();
  let isCurrentUser = false;
  
  // Initialize page
  function init() {
    // Set up back button
    const backButton = document.getElementById('back-button');
    if (backButton) {
      backButton.addEventListener('click', function() {
        window.history.back();
      });
    }
    
    // Logo click to go home
    document.querySelector('.logo').addEventListener('click', function() {
      window.location.href = 'index.html';
    });
    
    room.party.subscribe(peers => {
      isCurrentUser = room.party.client.username === username;
      // Load user profile and watch history
      loadUserProfile();
      loadWatchHistory();
    });
    
    // Setup load more button
    const loadMoreButton = document.getElementById('load-more-button');
    if (loadMoreButton) {
      loadMoreButton.addEventListener('click', loadMore);
    }
    
    // Setup infinite scroll
    window.addEventListener('scroll', handleScroll);
  }
  
  // Load user profile information
  function loadUserProfile() {
    // Update avatar
    const avatarImg = document.getElementById('profile-avatar');
    avatarImg.src = `https://images.websim.ai/avatar/${username}`;
    avatarImg.alt = `${username}'s avatar`;
    
    // Update username
    document.getElementById('profile-username').textContent = `@${username}`;
    document.title = `${username} - Adze.design`;
    
    // Get watch statistics from room collection
    room.collection('watch_history').filter({ username: username }).subscribe(function(history) {
      // Calculate stats
      const movies = history.filter(item => item.content_type === 'movie');
      const shows = history.filter(item => item.content_type === 'tv');
      
      // Count unique TV shows
      const uniqueShowIds = new Set();
      shows.forEach(item => uniqueShowIds.add(item.content_id));
      
      // Update stats
      document.getElementById('movies-watched').textContent = movies.length;
      document.getElementById('shows-watched').textContent = uniqueShowIds.size;
      
      // Calculate total watch time (estimated)
      let totalMinutes = 0;
      
      // Add movie runtimes if available
      movies.forEach(movie => {
        if (movie.runtime) {
          totalMinutes += movie.runtime;
        } else {
          // Estimate 2 hours per movie if runtime not available
          totalMinutes += 120;
        }
      });
      
      // Add TV episode times (estimate 45 minutes per episode)
      totalMinutes += shows.length * 45;
      
      // Convert to hours with one decimal place
      const totalHours = Math.round(totalMinutes / 6) / 10;
      document.getElementById('total-time').textContent = `${totalHours}h`;
      
      // Update bio with some stats
      const uniqueMovieIds = new Set(movies.map(m => m.content_id));
      document.getElementById('profile-bio').textContent = 
        `${isCurrentUser ? 'You have' : 'This user has'} watched ${uniqueMovieIds.size} unique movies and ${uniqueShowIds.size} TV shows on Adze.design`;
    });
  }
  
  // Load watch history
  function loadWatchHistory() {
    if (isLoading) return;
    isLoading = true;
    
    // Get the watch history container
    const historyGrid = document.getElementById('watch-history-grid');
    const loadMoreContainer = document.getElementById('load-more-container');
    
    // Show loading on first page
    if (currentPage === 1) {
      historyGrid.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading watch history...</p>
        </div>
      `;
    }
    
    // Get watch history from room collection with pagination
    room.collection('watch_history')
      .filter({ username: username })
      .subscribe(function(historyItems) {
        isLoading = false;
        
        // Clear loading state
        if (currentPage === 1) {
          historyGrid.innerHTML = '';
        }
        
        // Sort by most recent first
        const sortedItems = [...historyItems].sort((a, b) => 
          new Date(b.watched_at) - new Date(a.watched_at)
        );
        
        // Apply pagination
        const pageSize = 12;
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const pageItems = sortedItems.slice(startIndex, endIndex);
        
        // Calculate total pages
        totalPages = Math.ceil(sortedItems.length / pageSize);
        
        // Check if we have items for this page
        if (pageItems.length === 0 && currentPage === 1) {
          historyGrid.innerHTML = `
            <div class="loading-container">
              <p>No watch history available.</p>
            </div>
          `;
          loadMoreContainer.style.display = 'none';
          return;
        }
        
        // Process items - group by content to avoid duplicates
        const contentMap = new Map();
        
        pageItems.forEach(item => {
          // Create a unique key for movies or TV episodes
          const key = item.content_type === 'tv' 
            ? `${item.content_id}-${item.season}-${item.episode}`
            : item.content_id;
          
          // Only keep the most recent watch of each item
          if (!contentMap.has(key) || new Date(item.watched_at) > new Date(contentMap.get(key).watched_at)) {
            contentMap.set(key, item);
          }
        });
        
        // Create watch item cards for each unique content
        Array.from(contentMap.values()).forEach(item => createAndAppendWatchItem(item, historyGrid));
        
        // Show/hide load more button
        loadMoreContainer.style.display = currentPage < totalPages ? 'flex' : 'none';
      });
  }
  
  // Create and append a watch history item
  function createAndAppendWatchItem(item, container) {
    // Fetch content details from TMDB if needed
    let contentId = item.content_id;
    let contentType = item.content_type;
    
    // Create the watch item card
    const watchItem = document.createElement('div');
    watchItem.className = 'watch-item';
    
    // Determine title and poster based on available data
    const title = item.movie_title || item.show_title || 'Unknown Title';
    const posterPath = item.poster_path || 'https://via.placeholder.com/500x750?text=No+Image';
    
    // Format watch date
    const watchDate = new Date(item.watched_at).toLocaleDateString();
    
    // Create episode badge for TV shows
    let episodeBadge = '';
    if (contentType === 'tv' && item.season && item.episode) {
      episodeBadge = `
        <div class="episode-badge">S${item.season}:E${item.episode}</div>
      `;
    }
    
    watchItem.innerHTML = `
      <div class="watch-poster">
        <img src="${posterPath}" alt="${title}">
        <div class="content-type-badge">${contentType === 'movie' ? 'Movie' : 'TV'}</div>
        ${episodeBadge}
        <div class="watch-date">Watched on ${watchDate}</div>
      </div>
      <div class="watch-info">
        <div class="watch-title">${title}</div>
        <div class="watch-meta">
          ${item.episode_title ? `<div class="episode-title">${item.episode_title}</div>` : ''}
        </div>
      </div>
    `;
    
    // Add click handler
    watchItem.addEventListener('click', () => {
      if (contentType === 'movie') {
        window.location.href = `movie-view.html?id=${contentId}`;
      } else {
        // For TV shows, navigate to the specific episode if available
        if (item.season && item.episode) {
          window.location.href = `tv-watch.html?id=${contentId}&season=${item.season}&episode=${item.episode}`;
        } else {
          window.location.href = `tv-view.html?id=${contentId}`;
        }
      }
    });
    
    container.appendChild(watchItem);
  }
  
  // Handle infinite scroll
  function handleScroll() {
    if (isLoading || currentPage >= totalPages) return;
    
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    if (scrollY + viewportHeight >= documentHeight - 300) {
      loadMore();
    }
  }
  
  // Load more items
  function loadMore() {
    currentPage++;
    loadWatchHistory();
  }
  
  // Initialize the page
  init();
});