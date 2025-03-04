document.addEventListener('DOMContentLoaded', function() {
  // Get showId from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const showId = urlParams.get('id');
  
  if (!showId) {
    // If no show ID is provided, redirect back to browse
    window.location.href = 'browse.html';
    return;
  }
  
  const tmdbBaseUrl = 'https://api.themoviedb.org/3';
  const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
  const imageBaseUrl = 'https://image.tmdb.org/t/p/original';
  const posterBaseUrl = 'https://image.tmdb.org/t/p/w500';
  
  // State variables
  let currentShow = null;
  let currentSeasonNumber = 1;
  
  // Initialize WebsimSocket connection
  let room;
  let username;
  
  if (window.WebsimSocket) {
    room = new WebsimSocket();
    
    room.party.subscribe((peers) => {
      username = room.party.client.username;
      
      // After we have username, let's announce we're viewing this show
      room.send({
        type: "viewing",
        showId: showId,
        username: username || "User"
      });
    });
  }
  
  // Initialize page components
  function init() {
    // Set up back button
    const backButton = document.getElementById('back-button');
    if (backButton) {
      backButton.addEventListener('click', () => {
        window.history.back();
      });
    }
    
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
    
    // Logo click to go home
    document.querySelector('.logo').addEventListener('click', function() {
      window.location.href = 'index.html';
    });
  }
  
  // Fetch TV show details from TMDB API
  function fetchTVShowDetails() {
    fetch(`${tmdbBaseUrl}/tv/${showId}?api_key=${apiKey}&append_to_response=credits,videos,similar,content_ratings,external_ids`)
      .then(response => {
        if (!response.ok) {
          throw new Error('TV show not found');
        }
        return response.json();
      })
      .then(data => {
        // Store current show data globally
        currentShow = data;
        
        // Display TV show details
        displayTVShowDetails(data);
        
        // Display cast information
        displayCast(data.credits);
        
        // Display similar shows
        displaySimilarShows(data.similar);
        
        // Display watching avatars
        displayWatchingNow();
        
        // Load seasons and episodes
        loadSeasons(data.seasons);
        
        // Set up watchlist button
        setupAddToListButton(data);
      })
      .catch(error => {
        console.error('Error fetching TV show details:', error);
        const content = document.querySelector('.tv-view-content');
        
        if (content) {
          content.innerHTML = `
            <div class="error-container">
              <h2>Error Loading TV Show</h2>
              <p>${error.message}</p>
              <button id="go-back-button" class="go-back-button">Go Back</button>
            </div>
          `;
          
          const goBackButton = document.getElementById('go-back-button');
          if (goBackButton) {
            goBackButton.addEventListener('click', () => {
              window.location.href = 'browse.html';
            });
          }
        }
      });
  }
  
  // Display TV show details
  function displayTVShowDetails(show) {
    // Set page title
    document.title = `${show.name} - Adze.design`;
    
    // Update backdrop
    const backdropElement = document.getElementById('tv-backdrop');
    if (show.backdrop_path) {
      backdropElement.style.backgroundImage = `url(${imageBaseUrl}${show.backdrop_path})`;
    }
    
    // Update poster
    const posterElement = document.getElementById('tv-poster');
    posterElement.src = show.poster_path ? `${posterBaseUrl}${show.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image';
    posterElement.alt = show.name;
    
    // Update title and meta information
    document.getElementById('tv-title').textContent = show.name;
    
    // Get first air date year
    const firstAirYear = show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'N/A';
    document.getElementById('tv-year').textContent = firstAirYear;
    
    // Format seasons count
    const seasonCount = show.number_of_seasons || 0;
    document.getElementById('tv-seasons').textContent = `${seasonCount} ${seasonCount === 1 ? 'Season' : 'Seasons'}`;
    
    // Update rating
    document.getElementById('tv-rating').innerHTML = `<i class="fas fa-star"></i> ${show.vote_average ? show.vote_average.toFixed(1) : 'N/A'}`;
    
    // Update genres
    const genresElement = document.getElementById('tv-genres');
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
    
    // Update overview
    document.getElementById('tv-overview').textContent = show.overview || 'No overview available.';
    
    // Set up play button event
    const playButton = document.getElementById('play-button');
    if (playButton) {
      playButton.addEventListener('click', function() {
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
          // Navigate to the tv-watch page with season 1, episode 1
          window.location.href = `tv-watch.html?id=${show.id}&season=1&episode=1`;
          
          // Broadcast that you're watching this show
          if (room) {
            room.send({
              type: "watching",
              showId: show.id.toString(),
              showTitle: show.name,
              username: username || "User"
            });
          }
        }
      });
    }
    
    // Set up trailer button event
    const trailerButton = document.getElementById('trailer-button');
    if (trailerButton && show.videos && show.videos.results) {
      // Find trailer
      const trailer = show.videos.results.find(video => 
        video.type === 'Trailer' && video.site === 'YouTube'
      );
      
      if (trailer) {
        trailerButton.addEventListener('click', function() {
          // Navigate to the trailer-view page
          window.location.href = `trailer-view.html?id=${show.id}&type=tv&key=${trailer.key}`;
        });
      } else {
        trailerButton.disabled = true;
        trailerButton.innerHTML = '<i class="fas fa-film"></i> No Trailer';
        trailerButton.style.opacity = '0.5';
      }
    }
  }
  
  // Load seasons tabs
  function loadSeasons(seasons) {
    const seasonsContainer = document.getElementById('seasons-tabs');
    
    if (!seasons || seasons.length === 0) {
      seasonsContainer.innerHTML = 'No seasons information available.';
      return;
    }
    
    // Clear existing content
    seasonsContainer.innerHTML = '';
    
    // Filter out specials (season 0) and sort by season number
    const filteredSeasons = seasons
      .filter(season => season.season_number > 0)
      .sort((a, b) => a.season_number - b.season_number);
    
    // Create season tabs
    filteredSeasons.forEach(season => {
      const seasonTab = document.createElement('div');
      seasonTab.className = `season-tab ${season.season_number === currentSeasonNumber ? 'active' : ''}`;
      seasonTab.dataset.season = season.season_number;
      seasonTab.textContent = `Season ${season.season_number}`;
      
      seasonTab.addEventListener('click', function() {
        const seasonNumber = parseInt(this.dataset.season);
        
        // Update active tab
        document.querySelectorAll('.season-tab').forEach(tab => {
          tab.classList.remove('active');
        });
        this.classList.add('active');
        
        // Load episodes for this season
        currentSeasonNumber = seasonNumber;
        loadEpisodes(showId, seasonNumber);
      });
      
      seasonsContainer.appendChild(seasonTab);
    });
    
    // Load episodes for the first season by default
    loadEpisodes(showId, currentSeasonNumber);
  }
  
  // Load episodes for a specific season
  function loadEpisodes(showId, seasonNumber) {
    const episodesContainer = document.getElementById('episodes-container');
    
    // Show loading state
    episodesContainer.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading episodes...</p>
      </div>
    `;
    
    // Fetch season details from TMDB API
    fetch(`${tmdbBaseUrl}/tv/${showId}/season/${seasonNumber}?api_key=${apiKey}`)
      .then(response => response.json())
      .then(data => {
        // Clear loading state
        episodesContainer.innerHTML = '';
        
        // Check if there are episodes
        if (!data.episodes || data.episodes.length === 0) {
          episodesContainer.innerHTML = `
            <div class="no-episodes">
              <i class="fas fa-film"></i>
              <h3>No Episodes Available</h3>
              <p>Episodes for this season are not available at this time.</p>
            </div>
          `;
          return;
        }
        
        // Display episodes
        data.episodes.forEach(episode => {
          const episodeCard = createEpisodeCard(episode, seasonNumber);
          episodesContainer.appendChild(episodeCard);
        });
      })
      .catch(error => {
        console.error('Error fetching episodes:', error);
        episodesContainer.innerHTML = `
          <div class="no-episodes">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error Loading Episodes</h3>
            <p>We had trouble loading the episodes for this season. Please try again later.</p>
          </div>
        `;
      });
  }
  
  // Create an episode card element
  function createEpisodeCard(episode, seasonNumber) {
    const card = document.createElement('div');
    card.className = 'episode-card';
    
    // Format runtime in minutes
    const runtime = episode.runtime ? `${episode.runtime} min` : 'N/A';
    
    // Format air date
    const airDate = episode.air_date ? new Date(episode.air_date).toLocaleDateString() : 'TBA';
    
    // Get still image or use a placeholder
    const stillPath = episode.still_path 
      ? `${posterBaseUrl}${episode.still_path}`
      : 'https://via.placeholder.com/400x225?text=No+Preview';
    
    card.innerHTML = `
      <div class="episode-number">${episode.episode_number}</div>
      <div class="episode-thumbnail">
        <img src="${stillPath}" alt="Episode ${episode.episode_number}">
        <div class="episode-play-overlay">
          <i class="fas fa-play"></i>
        </div>
      </div>
      <div class="episode-info">
        <div class="episode-title">${episode.name}</div>
        <div class="episode-meta">
          <div class="episode-runtime">
            <i class="fas fa-clock"></i> ${runtime}
          </div>
          <div class="episode-date">
            <i class="fas fa-calendar-alt"></i> ${airDate}
          </div>
        </div>
        <div class="episode-overview">${episode.overview || 'No description available.'}</div>
      </div>
    `;
    
    // Add click event to play the episode
    card.addEventListener('click', function() {
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
        // Navigate to the tv-watch page
        window.location.href = `tv-watch.html?id=${showId}&season=${seasonNumber}&episode=${episode.episode_number}`;
        
        // Broadcast that you're watching this episode
        if (room) {
          room.send({
            type: "watching_episode",
            showId: showId,
            showTitle: currentShow.name,
            seasonNumber: seasonNumber,
            episodeNumber: episode.episode_number,
            episodeTitle: episode.name,
            username: username || "User"
          });
        }
      }
    });
    
    return card;
  }
  
  // Display cast
  function displayCast(credits) {
    const castContainer = document.getElementById('cast-container');
    
    // Clear loading message
    castContainer.innerHTML = '';
    
    // Only show the first 6 cast members
    const mainCast = credits.cast.slice(0, 6);
    
    mainCast.forEach(actor => {
      const castCard = document.createElement('div');
      castCard.className = 'cast-card';
      
      let photoUrl = actor.profile_path 
        ? `${posterBaseUrl}${actor.profile_path}`
        : 'https://via.placeholder.com/150x225?text=No+Image';
      
      castCard.innerHTML = `
        <div class="cast-photo">
          <img src="${photoUrl}" alt="${actor.name}">
        </div>
        <div class="cast-name">${actor.name}</div>
        <div class="cast-character">${actor.character}</div>
      `;
      
      // Add click event to navigate to person view
      castCard.addEventListener('click', function() {
        window.location.href = `person-view.html?id=${actor.id}`;
      });
      
      castContainer.appendChild(castCard);
    });
    
    // If no cast members are available
    if (mainCast.length === 0) {
      castContainer.innerHTML = '<p class="no-data">No cast information available</p>';
    }
  }
  
  // Display similar shows
  function displaySimilarShows(similar) {
    const similarContainer = document.getElementById('similar-shows-container');
    
    // Clear loading message
    similarContainer.innerHTML = '';
    
    // Only show the first 4 similar shows
    const similarShows = similar.results.slice(0, 4);
    
    similarShows.forEach(show => {
      const similarCard = document.createElement('div');
      similarCard.className = 'similar-show-card';
      
      let posterUrl = show.poster_path 
        ? `${posterBaseUrl}${show.poster_path}`
        : 'https://via.placeholder.com/500x750?text=No+Image';
      
      // Get first air date year
      const firstAirYear = show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'N/A';
      
      similarCard.innerHTML = `
        <div class="similar-show-poster">
          <img src="${posterUrl}" alt="${show.name}">
        </div>
        <div class="similar-show-title">${show.name}</div>
        <div class="similar-show-meta">
          <div class="similar-show-year">${firstAirYear}</div>
          <div class="similar-show-rating">
            <i class="fas fa-star"></i> ${show.vote_average.toFixed(1)}
          </div>
        </div>
      `;
      
      similarCard.addEventListener('click', () => {
        window.location.href = `tv-view.html?id=${show.id}`;
      });
      
      similarContainer.appendChild(similarCard);
    });
    
    // If no similar shows are available
    if (similarShows.length === 0) {
      similarContainer.innerHTML = '<p class="no-data">No similar shows available</p>';
    }
  }
  
  // Display watching now info
  function displayWatchingNow() {
    const container = document.getElementById('watching-now-avatars');
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Get real watch history from room collection
    let watchers = [];
    
    if (room) {
      // Get users who have watched this show recently
      room.collection('watch_history')
        .filter({ content_type: 'tv', content_id: showId })
        .subscribe(history => {
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
            watchers = Array.from(uniqueViewers.entries())
              .map(([username, watched_at]) => ({ username, watched_at }))
              .sort((a, b) => new Date(b.watched_at) - new Date(a.watched_at))
              .slice(0, 4); // Take just the 4 most recent viewers
            
            displayWatchers();
          } else {
            // If no real watch history, fall back to random followers
            addDefaultWatchers();
          }
        });
    } else {
      // If WebsimSocket is not available, use default watchers
      addDefaultWatchers();
    }
    
    function addDefaultWatchers() {
      // Add some random followers as watchers
      const fakeWatchers = [
        { username: 'Ikako.t' },
        { username: 'Nick.B' },
        { username: 'Vika.J' },
        { username: 'Alessandr.B' },
        { username: 'Anna.S' }
      ];
      
      // Take a random subset
      watchers = fakeWatchers
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(w => ({ username: w.username }));
      
      displayWatchers();
    }
    
    function displayWatchers() {
      // Display watchers and add click events
      watchers.forEach(watcher => {
        const img = document.createElement('img');
        img.src = `https://images.websim.ai/avatar/${watcher.username}`;
        img.alt = `${watcher.username}'s avatar`;
        img.setAttribute('data-username', watcher.username);
        
        // Add click event to navigate to user profile
        img.addEventListener('click', function(e) {
          e.stopPropagation(); // Prevent bubbling to card click
          const username = this.getAttribute('data-username');
          window.location.href = `user-profile.html?username=${username}`;
        });
        
        container.appendChild(img);
      });
      
      // Generate more watchers to show "+X more" counter
      const totalWatching = watchers.length + Math.floor(Math.random() * 10 + 5);
      
      // Add the counter showing additional watchers if needed
      if (totalWatching > watchers.length) {
        const counter = document.createElement('div');
        counter.className = 'watching-now-counter';
        counter.textContent = `+${totalWatching - watchers.length}`;
        container.appendChild(counter);
      }
    }
  }
  
  // Add watchlist functionality to the TV show page
  function setupAddToListButton(show) {
    const addButton = document.getElementById('add-button');
    if (addButton) {
      // Check if show is already in watchlist
      const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      const isInWatchlist = watchlist.some(item => item.id === show.id.toString() && item.type === 'tv');
      
      // Update button state
      if (isInWatchlist) {
        addButton.innerHTML = '<i class="fas fa-check"></i> In Watchlist';
        addButton.classList.add('in-watchlist');
      }
      
      addButton.addEventListener('click', function() {
        if (this.classList.contains('in-watchlist')) {
          // Remove from watchlist
          removeFromWatchlist(show.id.toString());
          this.innerHTML = '<i class="fas fa-plus"></i> Add to List';
          this.classList.remove('in-watchlist');
        } else {
          // Add to watchlist
          addToWatchlist(show);
          this.innerHTML = '<i class="fas fa-check"></i> In Watchlist';
          this.classList.add('in-watchlist');
        }
      });
    }
  }

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
        rating: show.vote_average.toFixed(1),
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
  
  // Handle incoming WebsimSocket events
  if (room) {
    room.onmessage = (event) => {
      const data = event.data;
      
      if (data.type === "watching" && data.showId === showId) {
        console.log(`${data.username} started watching this show too!`);
        
        // Show a notification
        const notification = document.createElement('div');
        notification.className = 'watch-notification';
        notification.innerHTML = `
          <div class="notification-avatar">
            <img src="https://images.websim.ai/avatar/${data.username}" alt="${data.username}'s avatar">
          </div>
          <div class="notification-text">${data.username} started watching too!</div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
          notification.classList.add('fade-out');
          setTimeout(() => {
            notification.remove();
          }, 500);
        }, 3000);
      }
      else if (data.type === "watching_episode" && data.showId === showId) {
        console.log(`${data.username} started watching S${data.seasonNumber}E${data.episodeNumber}: ${data.episodeTitle}`);
        
        // Show a notification
        const notification = document.createElement('div');
        notification.className = 'watch-notification';
        notification.innerHTML = `
          <div class="notification-avatar">
            <img src="https://images.websim.ai/avatar/${data.username}" alt="${data.username}'s avatar">
          </div>
          <div class="notification-text">${data.username} started watching S${data.seasonNumber}E${data.episodeNumber}</div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
          notification.classList.add('fade-out');
          setTimeout(() => {
            notification.remove();
          }, 500);
        }, 3000);
      }
    };
  }
  
  // Initialize the page
  init();
});