document.addEventListener('DOMContentLoaded', function() {
  // Get show and episode parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const showId = urlParams.get('id');
  let seasonParam = urlParams.get('season') || '1';
  let episodeParam = urlParams.get('episode') || '1';
  
  // Convert to numbers
  const initialSeason = parseInt(seasonParam, 10);
  const initialEpisode = parseInt(episodeParam, 10);
  
  if (!showId) {
    // If no show ID is provided, redirect back to home
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
  const seasonSelect = document.getElementById('season-select');
  const episodeSelect = document.getElementById('episode-select');
  const playEpisodeButton = document.getElementById('play-episode-button');
  const fullscreenButton = document.getElementById('fullscreen-button');
  const addWatchlistButton = document.getElementById('add-watchlist-button');
  const shareButton = document.getElementById('share-button');
  
  // State variables
  let currentShow = null;
  let currentType = 'tv';
  let currentSeason = initialSeason;
  let currentEpisode = initialEpisode;
  let seasons = [];
  let episodes = [];
  
  // Initialize WebsimSocket connection
  let room;
  let username;
  
  if (window.WebsimSocket) {
    room = new WebsimSocket();
    
    room.party.subscribe((peers) => {
      username = room.party.client.username;
      
      // After we have username, let's announce we're viewing this show
      room.send({
        type: "viewing_tv",
        showId: showId,
        username: username || "User"
      });
    });
  }
  
  // Initialize page
  function init() {
    // Check if following Brian_luceca before watching
    if (window.showFollowModal) {
      window.showFollowModal(function() {
        // This function runs after following or if already following
        startPlayback();
      });
    } else {
      startPlayback();
    }
    
    function startPlayback() {
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
          playEpisode(showId, currentSeason, currentEpisode);
        });
      }
      
      // Set up season and episode selectors
      if (seasonSelect && episodeSelect) {
        seasonSelect.addEventListener('change', function() {
          currentSeason = parseInt(this.value, 10);
          loadEpisodes(currentSeason);
        });
        
        episodeSelect.addEventListener('change', function() {
          currentEpisode = parseInt(this.value, 10);
          updateEpisodeInfo();
        });
      }
      
      // Set up play episode button
      if (playEpisodeButton) {
        playEpisodeButton.addEventListener('click', function() {
          playEpisode(showId, currentSeason, currentEpisode);
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
      
      // Fetch TV show details
      fetchTVShowDetails();
      
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
      
      // Play the initial episode
      playEpisode(showId, currentSeason, currentEpisode);
    }
  }
  
  // Play episode using vidsrc.xyz embed
  function playEpisode(showId, season, episode) {
    videoIframe.src = `https://vidsrc.xyz/embed/tv/${showId}/${season}-${episode}`;
    
    // Update URL without reloading
    const newUrl = `tv-watch.html?id=${showId}&season=${season}&episode=${episode}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
    
    // Show loading overlay
    loadingOverlay.style.display = 'flex';
    errorOverlay.style.display = 'none';
    
    // Listen for iframe load event
    videoIframe.onload = function() {
      // Hide loading overlay after iframe loads
      loadingOverlay.style.display = 'none';
      
      // Record watch history - now saving more detailed information
      if (room && username) {
        const episodeDetails = episodes.find(ep => ep.episode_number === episode);
        const episodeTitle = episodeDetails ? episodeDetails.name : `Episode ${episode}`;
        
        room.collection('watch_history').create({
          content_id: showId,
          content_type: 'tv',
          username: username,
          season: season,
          episode: episode,
          episode_title: episodeTitle,
          show_title: currentShow ? currentShow.name : null,
          poster_path: currentShow && currentShow.poster_path ? `${posterBaseUrl}${currentShow.poster_path}` : null,
          watched_at: new Date().toISOString()
        });
      }
      
      // Announce that user is watching this episode
      if (room && currentShow) {
        const episodeDetails = episodes.find(ep => ep.episode_number === episode);
        const episodeTitle = episodeDetails ? episodeDetails.name : `Episode ${episode}`;
        
        room.send({
          type: "watching_tv_episode",
          showId: showId,
          showTitle: currentShow.name,
          season: season,
          episode: episode,
          episodeTitle: episodeTitle,
          username: username || "User"
        });
      }
    };
    
    // Handle errors
    videoIframe.onerror = function() {
      loadingOverlay.style.display = 'none';
      errorOverlay.style.display = 'flex';
    };
    
    // Set a timeout in case the iframe doesn't trigger load/error events
    setTimeout(function() {
      if (loadingOverlay.style.display !== 'none') {
        loadingOverlay.style.display = 'none';
      }
    }, 10000);
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

  // Populate season select dropdown
  function populateSeasons(seasons) {
    if (!seasonSelect) return;
    
    seasonSelect.innerHTML = '';
    
    seasons.forEach(season => {
      const option = document.createElement('option');
      option.value = season.season_number;
      option.textContent = `Season ${season.season_number}`;
      
      // Select the initial season
      if (season.season_number === currentSeason) {
        option.selected = true;
      }
      
      seasonSelect.appendChild(option);
    });
  }
  
  // Load episodes for a given season
  function loadEpisodes(seasonNumber) {
    // Show loading state
    if (episodeSelect) {
      episodeSelect.innerHTML = '<option value="">Loading...</option>';
      episodeSelect.disabled = true;
    }
    
    fetch(`${tmdbBaseUrl}/tv/${showId}/season/${seasonNumber}?api_key=${apiKey}`)
      .then(response => response.json())
      .then(data => {
        // Store episodes
        episodes = data.episodes;
        
        // Populate episode select
        populateEpisodeSelect(episodes);
        
        // Update episode info
        updateEpisodeInfo();
        
        // Populate next episodes
        displayNextEpisodes();
      })
      .catch(error => {
        console.error('Error fetching episodes:', error);
        if (episodeSelect) {
          episodeSelect.innerHTML = '<option value="">Error loading episodes</option>';
        }
      });
  }
  
  // Populate episode select dropdown
  function populateEpisodeSelect(episodes) {
    if (!episodeSelect) return;
    
    episodeSelect.innerHTML = '';
    episodeSelect.disabled = false;
    
    episodes.forEach(episode => {
      const option = document.createElement('option');
      option.value = episode.episode_number;
      option.textContent = `${episode.episode_number}. ${episode.name}`;
      
      // Select the current episode
      if (episode.episode_number === currentEpisode) {
        option.selected = true;
      }
      
      episodeSelect.appendChild(option);
    });
  }
  
  // Update episode information
  function updateEpisodeInfo() {
    const episodeDetails = episodes.find(ep => ep.episode_number === currentEpisode);
    
    if (episodeDetails) {
      // Update episode title
      const episodeTitle = document.getElementById('episode-title');
      if (episodeTitle) {
        episodeTitle.textContent = episodeDetails.name;
      }
      
      // Update episode info in the watch meta
      const episodeInfo = document.getElementById('episode-info');
      if (episodeInfo) {
        episodeInfo.textContent = `S${currentSeason}E${currentEpisode}`;
      }
      
      // Update overview
      const overview = document.getElementById('episode-overview');
      if (overview) {
        overview.textContent = episodeDetails.overview || 'No overview available for this episode.';
      }
    }
  }
  
  // Display TV show details in the UI
  function displayTVShowDetails(show) {
    // Set page title
    document.title = `Watch ${show.name} - Adze.design`;
    
    // Update title and metadata
    const titleElement = document.getElementById('show-title');
    if (titleElement) {
      titleElement.textContent = show.name;
    }
    
    // Get first air date year
    const firstAirYear = show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'N/A';
    const yearElement = document.getElementById('show-year');
    if (yearElement) {
      yearElement.textContent = firstAirYear;
    }
    
    // Update rating
    const ratingElement = document.getElementById('show-rating');
    if (ratingElement) {
      ratingElement.innerHTML = `<i class="fas fa-star"></i> ${show.vote_average ? show.vote_average.toFixed(1) : 'N/A'}`;
    }
    
    // Update genres
    const genresElement = document.getElementById('tv-genres');
    if (genresElement) {
      genresElement.innerHTML = '';
      
      if (show.genres && show.genres.length > 0) {
        show.genres.forEach(genre => {
          const genreTag = document.createElement('div');
          genreTag.className = 'genre-tag';
          genreTag.textContent = genre.name;
          genresElement.appendChild(genreTag);
        });
      } else {
        genresElement.innerHTML = '<div class="genre-tag">No Genres</div>';
      }
    }
  }
  
  // Display cast information
  function displayCast(credits) {
    const castList = document.getElementById('cast-list');
    if (!castList) return;
    
    // Take only first 10 cast members
    const mainCast = credits.cast.slice(0, 10);
    
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
      const castSection = document.querySelector('.cast-section');
      if (castSection) {
        castSection.style.display = 'none';
      }
    }
  }
  
  // Display next episodes
  function displayNextEpisodes() {
    const nextEpisodesList = document.getElementById('next-episodes-list');
    if (!nextEpisodesList) return;
    
    nextEpisodesList.innerHTML = '';
    
    // Get up to 3 next episodes
    const currentEpisodeIndex = episodes.findIndex(ep => ep.episode_number === currentEpisode);
    const nextEpisodes = episodes.slice(currentEpisodeIndex + 1, currentEpisodeIndex + 4);
    
    if (nextEpisodes.length > 0) {
      nextEpisodes.forEach(episode => {
        const episodeCard = document.createElement('div');
        episodeCard.className = 'episode-card';
        
        const stillPath = episode.still_path 
          ? `${posterBaseUrl}${episode.still_path}`
          : 'https://via.placeholder.com/400x225?text=No+Preview';
        
        episodeCard.innerHTML = `
          <div class="episode-card-thumbnail">
            <img src="${stillPath}" alt="Episode ${episode.episode_number}">
            <div class="episode-number-badge">S${currentSeason}E${episode.episode_number}</div>
          </div>
          <div class="episode-card-info">
            <div class="episode-card-title">${episode.name}</div>
            <div class="episode-card-meta">${episode.air_date ? new Date(episode.air_date).toLocaleDateString() : 'TBA'}</div>
          </div>
        `;
        
        episodeCard.addEventListener('click', () => {
          currentEpisode = episode.episode_number;
          if (episodeSelect) {
            episodeSelect.value = episode.episode_number;
          }
          updateEpisodeInfo();
          playEpisode(showId, currentSeason, currentEpisode);
        });
        
        nextEpisodesList.appendChild(episodeCard);
      });
    } else {
      // If no next episodes in this season
      const noNextEpisodes = document.createElement('p');
      noNextEpisodes.className = 'no-next-episodes';
      
      if (currentSeason < seasons.length) {
        noNextEpisodes.innerHTML = `
          No more episodes in this season. 
          <span class="next-season-link" id="next-season-link">Go to Season ${currentSeason + 1}</span>
        `;
        
        nextEpisodesList.appendChild(noNextEpisodes);
        
        // Add event listener to next season link
        const nextSeasonLink = document.getElementById('next-season-link');
        if (nextSeasonLink) {
          nextSeasonLink.addEventListener('click', () => {
            currentSeason++;
            currentEpisode = 1;
            if (seasonSelect) {
              seasonSelect.value = currentSeason;
            }
            loadEpisodes(currentSeason);
          });
        }
      } else {
        noNextEpisodes.textContent = 'No more episodes available.';
        nextEpisodesList.appendChild(noNextEpisodes);
      }
    }
  }
  
  // Display watching now avatars
  function displayWatchingNow() {
    const watchingContainer = document.getElementById('watching-now-avatars');
    if (!watchingContainer) return;
    
    // Start with peers who might be watching
    const watchers = [];
    
    // If WebsimSocket is available, check for watchers
    if (room && room.party.peers) {
      for (const clientId in room.party.peers) {
        const peer = room.party.peers[clientId];
        
        // Skip current user and only include some peers randomly
        if (clientId === room.party.client.id || Math.random() > 0.5) continue;
        
        watchers.push({
          username: peer.username
        });
        
        // Limit to 4 watchers
        if (watchers.length >= 4) break;
      }
    }
    
    // If we don't have enough real watchers, add some fake ones
    if (watchers.length < 3) {
      const fakeWatchers = [
        { username: 'Ikako.t' },
        { username: 'Nick.B' },
        { username: 'Vika.J' },
        { username: 'Alessandr.B' },
        { username: 'Anna.S' }
      ];
      
      // Shuffle and pick a few
      const shuffled = [...fakeWatchers].sort(() => 0.5 - Math.random());
      
      for (let i = 0; watchers.length < 3 && i < shuffled.length; i++) {
        watchers.push(shuffled[i]);
      }
    }
    
    // Clear container and add watchers
    watchingContainer.innerHTML = '';
    
    watchers.forEach(watcher => {
      const img = document.createElement('img');
      img.src = `https://images.websim.ai/avatar/${watcher.username}`;
      img.alt = `${watcher.username}'s avatar`;
      watchingContainer.appendChild(img);
    });
    
    // Add counter if more than the shown avatars
    if (watchers.length >= 3) {
      const counter = document.createElement('div');
      counter.className = 'watching-now-counter';
      counter.textContent = `+${Math.floor(Math.random() * 10) + 3}`;
      watchingContainer.appendChild(counter);
    }
  }
  
  // Set up watchlist button
  function setupWatchlistButton(show) {
    if (!addWatchlistButton) return;
    
    // Check if show is already in watchlist
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    const isInWatchlist = watchlist.some(item => item.id === show.id.toString() && item.type === 'tv');
    
    // Update button state
    if (isInWatchlist) {
      addWatchlistButton.innerHTML = '<i class="fas fa-heart"></i> In Watchlist';
      addWatchlistButton.classList.add('in-watchlist');
    }
    
    addWatchlistButton.addEventListener('click', function() {
      if (this.classList.contains('in-watchlist')) {
        // Remove from watchlist
        removeFromWatchlist(show.id.toString());
        this.innerHTML = '<i class="far fa-heart"></i> Add to List';
        this.classList.remove('in-watchlist');
      } else {
        // Add to watchlist
        addToWatchlist(show);
        this.innerHTML = '<i class="fas fa-heart"></i> In Watchlist';
        this.classList.add('in-watchlist');
      }
    });
  }
  
  // Add show to watchlist
  function addToWatchlist(show) {
    // Get existing watchlist
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    
    // Check if already in watchlist
    if (!watchlist.some(item => item.id === show.id.toString() && item.type === 'tv')) {
      // Add to watchlist
      watchlist.push({
        id: show.id.toString(),
        type: 'tv',
        title: show.name,
        poster: show.poster_path ? `${posterBaseUrl}${show.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image',
        rating: show.vote_average ? show.vote_average.toFixed(1) : 'N/A',
        year: show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'N/A',
        dateAdded: new Date().toISOString()
      });
      
      // Save to local storage
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
      
      // If using WebsimSocket, persist to room collection
      if (room) {
        room.collection('watchlist').create({
          content_id: show.id.toString(),
          content_type: 'tv',
          title: show.name,
          poster_url: show.poster_path ? `${posterBaseUrl}${show.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image',
          added_at: new Date().toISOString()
        });
      }
      
      // Show notification
      showNotification(`Added "${show.name}" to your watchlist`);
    }
  }
  
  // Remove show from watchlist
  function removeFromWatchlist(showId) {
    // Get existing watchlist
    let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    
    // Find and remove the show
    const showToRemove = watchlist.find(item => item.id === showId && item.type === 'tv');
    
    if (showToRemove) {
      // Remove from watchlist
      watchlist = watchlist.filter(item => !(item.id === showId && item.type === 'tv'));
      
      // Save to local storage
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
      
      // If using WebsimSocket, remove from room collection
      if (room) {
        // Get all watchlist records
        const watchlistItems = room.collection('watchlist').filter({ content_id: showId, content_type: 'tv' }).getList();
        
        // Delete each matching record
        watchlistItems.forEach(item => {
          room.collection('watchlist').delete(item.id);
        });
      }
      
      // Show notification
      showNotification(`Removed "${showToRemove.title}" from your watchlist`);
    }
  }
  
  // Share content
  function shareContent() {
    if (!currentShow) return;
    
    // Create share data
    const shareData = {
      title: `Watch ${currentShow.name}`,
      text: `Check out ${currentShow.name} S${currentSeason}E${currentEpisode} on Adze.design!`,
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
      errorText.textContent = message || 'Sorry, this episode cannot be played at the moment.';
    }
  }
  
  // Fetch TV show details from TMDB API
  function fetchTVShowDetails() {
    fetch(`${tmdbBaseUrl}/tv/${showId}?api_key=${apiKey}&append_to_response=credits,videos,external_ids`)
      .then(response => {
        if (!response.ok) {
          throw new Error('TV show not found');
        }
        return response.json();
      })
      .then(data => {
        // Store current show data
        currentShow = data;
        
        // Store seasons
        seasons = data.seasons.filter(season => season.season_number > 0);
        
        // Display TV show details
        displayTVShowDetails(data);
        
        // Load seasons and episodes
        populateSeasons(seasons);
        loadEpisodes(currentSeason);
        
        // Display cast
        displayCast(data.credits);
        
        // Display watching avatars
        displayWatchingNow();
        
        // Set up watchlist button
        setupWatchlistButton(data);
      })
      .catch(error => {
        console.error('Error fetching TV show details:', error);
        showErrorMessage(error.message);
      });
  }
  
  // Handle incoming WebsimSocket events
  if (room) {
    room.onmessage = (event) => {
      const data = event.data;
      
      if (data.type === "viewing_tv" || data.type === "watching_tv_episode") {
        if (data.showId === showId && data.username !== username) {
          console.log(`${data.username} is ${data.type === "viewing_tv" ? "viewing" : "watching"} this show`);
          
          // Update watching avatars
          displayWatchingNow();
          
          // Show notification
          let message = `${data.username} is viewing this show`;
          if (data.type === "watching_tv_episode") {
            message = `${data.username} is watching S${data.season}E${data.episode}`;
          }
          
          showNotification(message);
        }
      }
    };
  }
  
  // Initialize the page
  init();
});