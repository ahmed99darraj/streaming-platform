document.addEventListener('DOMContentLoaded', function() {
  // Get parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const contentId = urlParams.get('id');
  const contentType = urlParams.get('type') || 'movie'; // Default to movie
  const videoKey = urlParams.get('key');
  
  if (!contentId || !videoKey) {
    // If required params are missing, redirect back to home
    window.location.href = 'index.html';
    return;
  }
  
  // TMDB API Configuration
  const tmdbBaseUrl = 'https://api.themoviedb.org/3';
  const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
  const posterBaseUrl = 'https://image.tmdb.org/t/p/w500';
  
  // DOM elements
  const trailerIframe = document.getElementById('trailer-iframe');
  const loadingOverlay = document.getElementById('loading-overlay');
  const errorOverlay = document.getElementById('error-overlay');
  const retryButton = document.getElementById('retry-button');
  const backButton = document.getElementById('back-button');
  const watchFullButton = document.getElementById('watch-full-button');
  const addWatchlistButton = document.getElementById('add-watchlist-button');
  const shareButton = document.getElementById('share-button');
  
  // State variables
  let contentDetails = null;
  let trailers = [];
  
  // Initialize WebsimSocket connection
  let room;
  let username;
  
  if (window.WebsimSocket) {
    room = new WebsimSocket();
    
    room.party.subscribe((peers) => {
      username = room.party.client.username;
      
      // After we have username, let's announce we're viewing this trailer
      room.send({
        type: "viewing_trailer",
        contentId: contentId,
        contentType: contentType,
        username: username || "User"
      });
    });
  }
  
  // Initialize page
  function init() {
    // Play the trailer
    playTrailer(videoKey);
    
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
        playTrailer(videoKey);
      });
    }
    
    // Set up share button
    if (shareButton) {
      shareButton.addEventListener('click', function() {
        shareContent();
      });
    }
    
    // Fetch content details
    fetchContentDetails();
    
    // Set up sidebar menu navigation
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
      item.addEventListener('click', function() {
        if (!this.classList.contains('active')) {
          if (this.textContent.trim() === 'Browse') {
            window.location.href = 'browse.html';
          } else if (this.textContent.trim() === 'Watchlist') {
            window.location.href = 'watchlist.html';
          } else if (this.textContent.trim() === 'Coming Soon') {
            // Could implement a coming soon page
            alert('Coming Soon page would go here');
          }
        }
      });
    });
    
    // Prevent new tab redirects
    setupPopupBlocker();
  }
  
  // Play trailer using YouTube embed
  function playTrailer(key) {
    trailerIframe.src = `https://www.youtube.com/embed/${key}?autoplay=1&rel=0`;
    
    // Show loading overlay
    loadingOverlay.style.display = 'flex';
    errorOverlay.style.display = 'none';
    
    // Listen for iframe load event
    trailerIframe.onload = function() {
      // Hide loading overlay after iframe loads
      loadingOverlay.style.display = 'none';
      
      // Announce that user is watching this trailer
      if (room && contentDetails) {
        const title = contentType === 'movie' ? contentDetails.title : contentDetails.name;
        
        room.send({
          type: "watching_trailer",
          contentId: contentId,
          contentType: contentType,
          contentTitle: title,
          username: username || "User"
        });
      }
    };
    
    // Handle errors
    trailerIframe.onerror = function() {
      loadingOverlay.style.display = 'none';
      errorOverlay.style.display = 'flex';
    };
    
    // Set a timeout in case the iframe doesn't trigger load/error events
    setTimeout(function() {
      if (loadingOverlay.style.display !== 'none') {
        loadingOverlay.style.display = 'none';
      }
    }, 5000);
  }
  
  // Fetch content details from TMDB API
  function fetchContentDetails() {
    const endpoint = contentType === 'movie' 
      ? `${tmdbBaseUrl}/movie/${contentId}?api_key=${apiKey}&append_to_response=videos,credits`
      : `${tmdbBaseUrl}/tv/${contentId}?api_key=${apiKey}&append_to_response=videos,credits`;
    
    fetch(endpoint)
      .then(response => {
        if (!response.ok) {
          throw new Error(`${contentType === 'movie' ? 'Movie' : 'TV show'} not found`);
        }
        return response.json();
      })
      .then(data => {
        // Store content data
        contentDetails = data;
        
        // Get all trailers
        if (data.videos && data.videos.results) {
          trailers = data.videos.results.filter(video => 
            video.site === 'YouTube' && 
            (video.type === 'Trailer' || video.type === 'Teaser')
          );
        }
        
        // Display content details
        displayContentDetails(data);
        
        // Display more trailers if available
        displayMoreTrailers(trailers);
        
        // Set up watch full button
        setupWatchFullButton(data);
        
        // Set up watchlist button
        setupWatchlistButton(data);
      })
      .catch(error => {
        console.error('Error fetching content details:', error);
        showErrorMessage(error.message);
      });
  }
  
  // Display content details in the UI
  function displayContentDetails(content) {
    // Determine title based on content type
    const title = contentType === 'movie' ? content.title : content.name;
    
    // Set page title
    document.title = `${title} - Trailer - Adze.design`;
    
    // Update title and metadata
    document.getElementById('trailer-title').textContent = title;
    
    // Update content type badge
    document.getElementById('content-type').textContent = contentType === 'movie' ? 'Movie' : 'TV Show';
    
    // Get release/air date year
    const yearField = contentType === 'movie' ? content.release_date : content.first_air_date;
    const year = yearField ? new Date(yearField).getFullYear() : 'N/A';
    document.getElementById('content-year').textContent = year;
    
    // Format runtime (for movies) or seasons (for TV shows)
    if (contentType === 'movie') {
      const hours = Math.floor(content.runtime / 60);
      const minutes = content.runtime % 60;
      document.getElementById('content-runtime').textContent = `${hours}h ${minutes}m`;
    } else {
      document.getElementById('content-runtime').textContent = `${content.number_of_seasons} Season${content.number_of_seasons !== 1 ? 's' : ''}`;
    }
    
    // Update rating
    document.getElementById('content-rating').innerHTML = `<i class="fas fa-star"></i> ${content.vote_average ? content.vote_average.toFixed(1) : 'N/A'}`;
    
    // Update poster
    const posterElement = document.querySelector('#trailer-poster img');
    posterElement.src = content.poster_path 
      ? `${posterBaseUrl}${content.poster_path}`
      : 'https://via.placeholder.com/500x750?text=No+Image';
    posterElement.alt = title;
    
    // Update overview
    document.getElementById('content-overview').textContent = content.overview || 'No overview available.';
    
    // Update genres
    const genresElement = document.getElementById('trailer-genres');
    genresElement.innerHTML = '';
    
    if (content.genres && content.genres.length > 0) {
      content.genres.forEach(genre => {
        const genreTag = document.createElement('div');
        genreTag.className = 'genre-tag';
        genreTag.textContent = genre.name;
        genresElement.appendChild(genreTag);
      });
    } else {
      genresElement.innerHTML = '<div class="genre-tag">No Genres</div>';
    }
  }
  
  // Display more trailers if available
  function displayMoreTrailers(trailers) {
    const moreTrailersSection = document.getElementById('more-trailers-section');
    const moreTrailersList = document.getElementById('more-trailers-list');
    
    // Skip the current trailer
    const otherTrailers = trailers.filter(trailer => trailer.key !== videoKey);
    
    if (otherTrailers.length > 0) {
      moreTrailersList.innerHTML = '';
      
      otherTrailers.forEach(trailer => {
        const trailerCard = document.createElement('div');
        trailerCard.className = 'trailer-card';
        
        // Get thumbnail from YouTube
        const thumbnailUrl = `https://img.youtube.com/vi/${trailer.key}/mqdefault.jpg`;
        
        trailerCard.innerHTML = `
          <div class="trailer-thumbnail">
            <img src="${thumbnailUrl}" alt="${trailer.name}">
            <div class="play-overlay">
              <i class="fas fa-play-circle"></i>
            </div>
          </div>
          <div class="trailer-info-card">
            <div class="trailer-name">${trailer.name}</div>
            <div class="trailer-type">${trailer.type}</div>
          </div>
        `;
        
        trailerCard.addEventListener('click', () => {
          // Update URL parameters and reload
          const newUrl = `trailer-view.html?id=${contentId}&type=${contentType}&key=${trailer.key}`;
          window.location.href = newUrl;
        });
        
        moreTrailersList.appendChild(trailerCard);
      });
    } else {
      moreTrailersSection.style.display = 'none';
    }
  }
  
  // Set up watch full button
  function setupWatchFullButton(content) {
    if (!watchFullButton) return;
    
    // Update button text based on content type
    watchFullButton.innerHTML = `<i class="fas fa-play"></i> Watch Full ${contentType === 'movie' ? 'Movie' : 'Show'}`;
    
    watchFullButton.addEventListener('click', function() {
      // Check if following Brian_luceca before watching
      if (window.showFollowModal) {
        window.showFollowModal(function() {
          // This function runs after following or if already following
          navigateToWatch();
        });
      } else {
        navigateToWatch();
      }
      
      function navigateToWatch() {
        // Navigate to the appropriate watch page
        if (contentType === 'movie') {
          window.location.href = `movie-watch.html?id=${contentId}`;
        } else {
          window.location.href = `tv-watch.html?id=${contentId}`;
        }
      }
    });
  }
  
  // Set up watchlist button
  function setupWatchlistButton(content) {
    if (!addWatchlistButton) return;
    
    // Check if content is already in watchlist
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    const isInWatchlist = watchlist.some(item => item.id === contentId && item.type === contentType);
    
    // Update button state
    if (isInWatchlist) {
      addWatchlistButton.innerHTML = '<i class="fas fa-heart"></i> In Watchlist';
      addWatchlistButton.classList.add('in-watchlist');
    }
    
    addWatchlistButton.addEventListener('click', function() {
      if (this.classList.contains('in-watchlist')) {
        // Remove from watchlist
        removeFromWatchlist(contentId);
        this.innerHTML = '<i class="far fa-heart"></i> Add to List';
        this.classList.remove('in-watchlist');
      } else {
        // Add to watchlist
        addToWatchlist(content);
        this.innerHTML = '<i class="fas fa-heart"></i> In Watchlist';
        this.classList.add('in-watchlist');
      }
    });
  }
  
  // Add content to watchlist
  function addToWatchlist(content) {
    // Get existing watchlist
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    
    // Determine title field based on content type
    const title = contentType === 'movie' ? content.title : content.name;
    
    // Determine date field based on content type
    const dateField = contentType === 'movie' ? content.release_date : content.first_air_date;
    const year = dateField ? new Date(dateField).getFullYear() : 'N/A';
    
    // Check if already in watchlist
    if (!watchlist.some(item => item.id === contentId && item.type === contentType)) {
      // Add to watchlist
      watchlist.push({
        id: contentId,
        type: contentType,
        title: title,
        poster: content.poster_path ? `${posterBaseUrl}${content.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image',
        rating: content.vote_average ? content.vote_average.toFixed(1) : 'N/A',
        year: year,
        dateAdded: new Date().toISOString()
      });
      
      // Save to local storage
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
      
      // If using WebsimSocket, persist to room collection
      if (room) {
        room.collection('watchlist').create({
          content_id: contentId,
          content_type: contentType,
          title: title,
          poster_url: content.poster_path ? `${posterBaseUrl}${content.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image',
          added_at: new Date().toISOString()
        });
      }
      
      // Show notification
      showNotification(`Added "${title}" to your watchlist`);
    }
  }
  
  // Remove content from watchlist
  function removeFromWatchlist(id) {
    // Get existing watchlist
    let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    
    // Find the item for notification
    const itemToRemove = watchlist.find(item => item.id === id && item.type === contentType);
    
    // Remove the item
    watchlist = watchlist.filter(item => !(item.id === id && item.type === contentType));
    
    // Save to local storage
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    
    // If using WebsimSocket, remove from room collection
    if (room) {
      // Get all watchlist records
      const watchlistItems = room.collection('watchlist').filter({ content_id: id, content_type: contentType }).getList();
      
      // Delete each matching record
      watchlistItems.forEach(item => {
        room.collection('watchlist').delete(item.id);
      });
    }
    
    // Show notification
    if (itemToRemove) {
      showNotification(`Removed "${itemToRemove.title}" from your watchlist`);
    }
  }
  
  // Share content
  function shareContent() {
    if (!contentDetails) return;
    
    // Determine title based on content type
    const title = contentType === 'movie' ? contentDetails.title : contentDetails.name;
    
    // Create share data
    const shareData = {
      title: `${title} - Trailer`,
      text: `Check out the trailer for ${title} on Adze.design!`,
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
  
  // Show error message
  function showErrorMessage(message) {
    loadingOverlay.style.display = 'none';
    errorOverlay.style.display = 'flex';
    const errorText = errorOverlay.querySelector('p');
    if (errorText) {
      errorText.textContent = message || 'Sorry, this trailer cannot be played at the moment.';
    }
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
    
    // Add it to the trailer container
    const trailerContainer = document.querySelector('.trailer-container');
    if (trailerContainer) {
      trailerContainer.style.position = 'relative';
      trailerContainer.appendChild(barrierDiv);
    }
    
    // Add event listener to window to prevent popups
    const handleBeforeUnload = function(e) {
      // Allow normal navigation from our own buttons
      const target = e.target;
      if (target && target.tagName === 'BUTTON') {
        return;
      }
      
      // Prevent any popups or redirects from iframe
      e.preventDefault();
      e.stopPropagation();
      return e.returnValue = 'Are you sure you want to leave?';
    };
    
    // Add event listener for preventing tab/window opening
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Override window.open
    const originalWindowOpen = window.open;
    window.open = function() {
      console.log('Popup blocked');
      return null;
    };
    
    // Cleanup on page unload
    window.addEventListener('unload', function() {
      window.open = originalWindowOpen;
      window.removeEventListener('beforeunload', handleBeforeUnload);
    });
  }

  // Initialize the page
  init();
});