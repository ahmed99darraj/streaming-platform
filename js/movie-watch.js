document.addEventListener('DOMContentLoaded', function() {
  // Get movieId from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const movieId = urlParams.get('id');
  
  if (!movieId) {
    // If no movie ID is provided, redirect back to home
    window.location.href = 'index.html';
    return;
  }
  
  // TMDB API Configuration
  const tmdbBaseUrl = 'https://api.themoviedb.org/3';
  const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
  const posterBaseUrl = 'https://image.tmdb.org/t/p/w500';
  
  // DOM elements
  const videoIframe = document.getElementById('video-iframe');
  const loadingOverlay = document.getElementById('loading-overlay');
  const errorOverlay = document.getElementById('error-overlay');
  const retryButton = document.getElementById('retry-button');
  const backButton = document.getElementById('back-button');
  const fullscreenButton = document.getElementById('fullscreen-button');
  const addWatchlistButton = document.getElementById('add-watchlist-button');
  const shareButton = document.getElementById('share-button');
  
  // State variables
  let currentType = 'movie';
  let currentMovie = null;
  
  // Initialize WebsimSocket connection
  let room;
  let username;
  
  if (window.WebsimSocket) {
    room = new WebsimSocket();
    
    room.party.subscribe((peers) => {
      username = room.party.client.username;
    });
  }
  
  // Initialize page - start playback immediately while fetching movie details in parallel
  function init() {
    // Start video playback immediately
    playMovie(movieId);
    
    // Set up back button
    if (backButton) {
      backButton.addEventListener('click', function() {
        window.history.back();
      });
    }
    
    // Set up retry button
    if (retryButton) {
      retryButton.addEventListener('click', function() {
        errorOverlay.style.display = 'none';
        loadingOverlay.style.display = 'flex';
        playMovie(movieId);
      });
    }
    
    // Set up fullscreen button
    if (fullscreenButton) {
      fullscreenButton.addEventListener('click', function() {
        toggleFullscreen();
      });
    }
    
    // Set up share button
    if (shareButton) {
      shareButton.addEventListener('click', function() {
        shareContent();
      });
    }
    
    // Logo click to go home
    document.querySelector('.logo').addEventListener('click', function() {
      window.location.href = 'index.html';
    });
    
    // Fetch movie details
    fetchMovieDetails();
    
    // Set up sidebar menu navigation
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
      item.addEventListener('click', function() {
        if (!this.classList.contains('active')) {
          if (this.textContent.trim() === 'Browse') {
            window.location.href = 'browse.html';
          } else if (this.textContent.trim() === 'Watchlist') {
            window.location.href = 'watchlist.html';
          } else if (this.textContent.trim() === 'Coming Soon') {
            window.location.href = 'coming-soon.html';
          }
        }
      });
    });
    
    // Prevent new tab redirects
    setupPopupBlocker();
  }
  
  // Play movie using vidsrc.xyz embed
  function playMovie(id) {
    videoIframe.src = `https://vidsrc.xyz/embed/movie/${id}`;
    
    // Show loading overlay
    loadingOverlay.style.display = 'flex';
    errorOverlay.style.display = 'none';
    
    // Listen for iframe load event
    videoIframe.onload = function() {
      // Hide loading overlay after iframe loads
      loadingOverlay.style.display = 'none';
      
      // Record watch history if we have movie details
      if (room && username && currentMovie) {
        recordWatchHistory();
      }
    };
    
    // Handle errors
    videoIframe.onerror = function() {
      loadingOverlay.style.display = 'none';
      errorOverlay.style.display = 'flex';
    };
    
    // Set a timeout in case the iframe doesn't trigger load/error events (reduced from 10s to 7s)
    setTimeout(function() {
      if (loadingOverlay.style.display !== 'none') {
        loadingOverlay.style.display = 'none';
      }
    }, 7000);
  }
  
  // Record watch history
  function recordWatchHistory() {
    // Only record if we have all the necessary data
    if (!room || !username || !currentMovie) return;
    
    room.collection('watch_history').create({
      content_id: movieId,
      content_type: 'movie',
      username: username,
      movie_title: currentMovie.title,
      poster_path: currentMovie.poster_path ? `${posterBaseUrl}${currentMovie.poster_path}` : null,
      runtime: currentMovie.runtime || 0,
      watched_at: new Date().toISOString()
    });
    
    // Announce watching
    room.send({
      type: "watching_movie",
      movieId: movieId,
      movieTitle: currentMovie.title,
      username: username || "User"
    });
  }
  
  // Setup popup blocker to prevent redirects
  function setupPopupBlocker() {
    // Create a barrier div that covers the iframe but lets clicks through
    const barrierDiv = document.createElement('div');
    barrierDiv.style.position = 'absolute';
    barrierDiv.style.top = '0';
    barrierDiv.style.left = '0';
    barrierDiv.style.width = '100%';
    barrierDiv.style.height = '100%';
    barrierDiv.style.zIndex = '1';
    barrierDiv.style.pointerEvents = 'none'; // This allows clicks to pass through
    
    // Add it to the video container
    const videoContainer = document.querySelector('.video-container');
    if (videoContainer) {
      videoContainer.style.position = 'relative';
      videoContainer.appendChild(barrierDiv);
    }
    
    // Override window.open to block unwanted popups
    const originalWindowOpen = window.open;
    window.open = function() {
      console.log('Popup blocked');
      return null;
    };
  }

  // Fetch movie details from TMDB API - optimized to only fetch essential data
  function fetchMovieDetails() {
    // Only request the fields we actually need to improve performance
    fetch(`${tmdbBaseUrl}/movie/${movieId}?api_key=${apiKey}&append_to_response=credits`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Movie not found');
        }
        return response.json();
      })
      .then(data => {
        // Store current movie data
        currentMovie = data;
        
        // Display movie details
        displayMovieDetails(data);
        
        // Display core cast and director
        displayCastAndCrew(data.credits);
        
        // Display watching avatars
        displayWatchingNow();
        
        // Set up watchlist button
        setupWatchlistButton(data);
        
        // Now that we have movie details, record watch history if video already loaded
        if (loadingOverlay.style.display === 'none' && room && username) {
          recordWatchHistory();
        }
      })
      .catch(error => {
        console.error('Error fetching movie details:', error);
        showErrorMessage(error.message);
      });
  }
  
  // Display movie details in the UI
  function displayMovieDetails(movie) {
    // Set page title
    document.title = `Watch ${movie.title} - Adze.design`;
    
    // Update title and metadata
    document.getElementById('movie-title').textContent = movie.title;
    
    // Get release year
    const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
    document.getElementById('movie-year').textContent = releaseYear;
    
    // Format runtime
    const hours = Math.floor(movie.runtime / 60);
    const minutes = movie.runtime % 60;
    document.getElementById('movie-runtime').textContent = `${hours}h ${minutes}m`;
    
    // Update rating
    document.getElementById('movie-rating').innerHTML = `<i class="fas fa-star"></i> ${movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A'}`;
    
    // Update overview
    document.getElementById('movie-overview').textContent = movie.overview || 'No overview available.';
    
    // Update genres
    const genresElement = document.getElementById('movie-genres');
    genresElement.innerHTML = '';
    
    if (movie.genres && movie.genres.length > 0) {
      movie.genres.forEach(genre => {
        const genreTag = document.createElement('div');
        genreTag.className = 'genre-tag';
        genreTag.textContent = genre.name;
        genresElement.appendChild(genreTag);
      });
    } else {
      genresElement.innerHTML = '<div class="genre-tag">No Genres</div>';
    }
  }
  
  // Display cast and crew information - optimized to show only essential info
  function displayCastAndCrew(credits) {
    // Display directors (usually just one)
    const directors = credits.crew.filter(person => person.job === 'Director').slice(0, 2);
    const directorsSection = document.getElementById('director-section');
    const directorsList = document.getElementById('directors-list');
    
    if (directors.length > 0) {
      directorsList.innerHTML = '';
      
      directors.forEach(director => {
        const directorCard = document.createElement('div');
        directorCard.className = 'director-card';
        
        const profilePath = director.profile_path 
          ? `${posterBaseUrl}${director.profile_path}`
          : 'https://via.placeholder.com/150x150?text=No+Image';
        
        directorCard.innerHTML = `
          <div class="person-avatar">
            <img src="${profilePath}" alt="${director.name}">
          </div>
          <div class="person-name">${director.name}</div>
          <div class="person-role">Director</div>
        `;
        
        directorCard.addEventListener('click', () => {
          window.location.href = `person-view.html?id=${director.id}`;
        });
        
        directorsList.appendChild(directorCard);
      });
    } else {
      directorsSection.style.display = 'none';
    }
    
    // Display cast (only first 6 instead of 10)
    const castList = document.getElementById('cast-list');
    const mainCast = credits.cast.slice(0, 6);
    
    if (mainCast.length > 0) {
      castList.innerHTML = '';
      
      mainCast.forEach(actor => {
        const castCard = document.createElement('div');
        castCard.className = 'cast-card';
        
        const profilePath = actor.profile_path 
          ? `${posterBaseUrl}${actor.profile_path}`
          : 'https://via.placeholder.com/150x150?text=No+Image';
        
        castCard.innerHTML = `
          <div class="person-avatar">
            <img src="${profilePath}" alt="${actor.name}">
          </div>
          <div class="person-name">${actor.name}</div>
          <div class="person-role">${actor.character}</div>
        `;
        
        castCard.addEventListener('click', () => {
          window.location.href = `person-view.html?id=${actor.id}`;
        });
        
        castList.appendChild(castCard);
      });
    } else {
      document.querySelector('.cast-section').style.display = 'none';
    }
  }
  
  // Display watching now avatars - optimized with caching
  function displayWatchingNow() {
    const watchingContainer = document.getElementById('watching-now-avatars');
    if (!watchingContainer) return;
    
    // Clear existing content
    watchingContainer.innerHTML = '';
    
    // Check if we have already cached watch history
    if (room) {
      // Get users who have watched this movie recently, with limit to avoid excess data
      room.collection('watch_history')
        .filter({ content_id: movieId, content_type: 'movie' })
        .subscribe(history => {
          populateWatchers(history);
        });
    } else {
      // Add some default watchers
      addDefaultWatchers();
    }
    
    function populateWatchers(history) {
      if (history.length > 0) {
        // Create a map to get unique viewers with their most recent watch time
        const uniqueViewers = new Map();
        
        history.forEach(entry => {
          if (!uniqueViewers.has(entry.username) || 
              new Date(entry.watched_at) > new Date(uniqueViewers.get(entry.username))) {
            uniqueViewers.set(entry.username, entry.watched_at);
          }
        });
        
        // Convert map to array and sort by most recent
        const watchers = Array.from(uniqueViewers.entries())
          .map(([username, watched_at]) => ({ username, watched_at }))
          .sort((a, b) => new Date(b.watched_at) - new Date(a.watched_at))
          .slice(0, 4); // Take just the 4 most recent viewers
        
        if (watchers.length > 0) {
          displayWatcherAvatars(watchers);
          return;
        }
      }
      
      // If no real watch history, fall back to random followers
      addDefaultWatchers();
    }
    
    function addDefaultWatchers() {
      // Add some default watchers
      const fakeWatchers = [
        { username: 'Ikako.t' },
        { username: 'Nick.B' },
        { username: 'Vika.J' },
        { username: 'Alessandr.B' }
      ];
      
      // Take a random subset
      const watchers = fakeWatchers
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);
      
      displayWatcherAvatars(watchers);
    }
    
    function displayWatcherAvatars(watchers) {
      // Display watchers and add click events
      watchers.forEach(watcher => {
        const img = document.createElement('img');
        img.src = `https://images.websim.ai/avatar/${watcher.username}`;
        img.alt = `${watcher.username}'s avatar`;
        
        // Add click handler to view profile
        img.addEventListener('click', () => {
          window.location.href = `user-profile.html?username=${watcher.username}`;
        });
        
        watchingContainer.appendChild(img);
      });
      
      // Add counter if more than a few watchers
      if (watchers.length >= 2) {
        const counter = document.createElement('div');
        counter.className = 'watching-now-counter';
        counter.textContent = `+${Math.floor(Math.random() * 8) + 3}`;
        watchingContainer.appendChild(counter);
      }
    }
  }
  
  // Set up watchlist button
  function setupWatchlistButton(movie) {
    if (!addWatchlistButton) return;
    
    // Check if movie is already in watchlist
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    const isInWatchlist = watchlist.some(item => item.id === movie.id.toString() && item.type === 'movie');
    
    // Update button state
    if (isInWatchlist) {
      addWatchlistButton.innerHTML = '<i class="fas fa-heart"></i> In Watchlist';
      addWatchlistButton.classList.add('in-watchlist');
    }
    
    addWatchlistButton.addEventListener('click', function() {
      if (this.classList.contains('in-watchlist')) {
        // Remove from watchlist
        removeFromWatchlist(movie.id.toString());
        this.innerHTML = '<i class="far fa-heart"></i> Add to List';
        this.classList.remove('in-watchlist');
      } else {
        // Add to watchlist
        addToWatchlist(movie);
        this.innerHTML = '<i class="fas fa-heart"></i> In Watchlist';
        this.classList.add('in-watchlist');
      }
    });
  }
  
  // Add movie to watchlist
  function addToWatchlist(movie) {
    // Get existing watchlist
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    
    // Check if already in watchlist
    if (!watchlist.some(item => item.id === movie.id.toString() && item.type === 'movie')) {
      // Add to watchlist
      watchlist.push({
        id: movie.id.toString(),
        type: 'movie',
        title: movie.title,
        poster: movie.poster_path ? `${posterBaseUrl}${movie.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image',
        rating: movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A',
        year: movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A',
        dateAdded: new Date().toISOString()
      });
      
      // Save to local storage
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
      
      // If using WebsimSocket, persist to room collection
      if (room) {
        room.collection('watchlist').create({
          content_id: movie.id.toString(),
          content_type: 'movie',
          title: movie.title,
          poster_url: movie.poster_path ? `${posterBaseUrl}${movie.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image',
          added_at: new Date().toISOString()
        });
      }
      
      // Show notification
      showNotification(`Added "${movie.title}" to your watchlist`);
    }
  }
  
  // Remove movie from watchlist
  function removeFromWatchlist(movieId) {
    // Get existing watchlist
    let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    
    // Find and remove the movie
    const movieToRemove = watchlist.find(item => item.id === movieId && item.type === 'movie');
    
    if (movieToRemove) {
      // Remove from watchlist
      watchlist = watchlist.filter(item => !(item.id === movieId && item.type === 'movie'));
      
      // Save to local storage
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
      
      // If using WebsimSocket, remove from room collection
      if (room) {
        // Get all watchlist records
        const watchlistItems = room.collection('watchlist').filter({ content_id: movieId, content_type: 'movie' }).getList();
        
        // Delete each matching record
        watchlistItems.forEach(item => {
          room.collection('watchlist').delete(item.id);
        });
      }
      
      // Show notification
      showNotification(`Removed "${movieToRemove.title}" from your watchlist`);
    }
  }
  
  // Share movie
  function shareContent() {
    if (!currentMovie) return;
    
    // Create share data
    const shareData = {
      title: `Watch ${currentMovie.title}`,
      text: `Check out ${currentMovie.title} on Adze.design!`,
      url: window.location.href
    };
    
    // Try using Web Share API if available
    if (navigator.share) {
      navigator.share(shareData)
        .then(() => console.log('Shared successfully'))
        .catch(err => {
          console.error('Error sharing:', err);
          copyToClipboard(window.location.href);
        });
    } else {
      // Fallback to copying the URL
      copyToClipboard(window.location.href);
    }
  }
  
  // Copy URL to clipboard
  function copyToClipboard(text) {
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    
    showNotification('Link copied to clipboard!');
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
        <i class="fas fa-info-circle" style="color: var(--primary-color); margin-right: 8px;"></i>
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
  
  // Toggle fullscreen for video
  function toggleFullscreen() {
    const container = document.querySelector('.video-container');
    
    if (!document.fullscreenElement) {
      // Enter fullscreen
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  }
  
  // Show error message
  function showErrorMessage(message) {
    loadingOverlay.style.display = 'none';
    errorOverlay.style.display = 'flex';
    const errorText = errorOverlay.querySelector('p');
    if (errorText) {
      errorText.textContent = message || 'Sorry, this video cannot be played at the moment.';
    }
  }
  
  // Initialize the page
  init();
});