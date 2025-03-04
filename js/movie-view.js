document.addEventListener('DOMContentLoaded', function() {
  // Get movieId from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const movieId = urlParams.get('id');
  
  if (!movieId) {
    // If no movie ID is provided, redirect back to home
    window.location.href = 'index.html';
    return;
  }
  
  const tmdbBaseUrl = 'https://api.themoviedb.org/3';
  const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
  const imageBaseUrl = 'https://image.tmdb.org/t/p/original';
  const posterBaseUrl = 'https://image.tmdb.org/t/p/w500';
  
  // Initialize WebsimSocket connection
  let room;
  let username;
  
  if (window.WebsimSocket) {
    room = new WebsimSocket();
    
    room.party.subscribe((peers) => {
      username = room.party.client.username;
      
      // After we have username, let's announce we're viewing this movie
      room.send({
        type: "viewing",
        movieId: movieId,
        username: username || "User"
      });
    });
  }
  
  // Fetch movie details
  fetch(`${tmdbBaseUrl}/movie/${movieId}?api_key=${apiKey}&append_to_response=credits,videos,similar,release_dates`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Movie not found');
      }
      return response.json();
    })
    .then(data => {
      displayMovieDetails(data);
      displayCast(data.credits);
      displaySimilarMovies(data.similar);
      displayWatchingNow();
      setupAddToListButton(data);
    })
    .catch(error => {
      console.error('Error fetching movie details:', error);
      const content = document.querySelector('.movie-view-content');
      
      if (content) {
        content.innerHTML = `
          <div class="error-container">
            <h2>Error Loading Movie</h2>
            <p>${error.message}</p>
            <button id="go-back-button" class="go-back-button">Go Back</button>
          </div>
        `;
        
        const goBackButton = document.getElementById('go-back-button');
        if (goBackButton) {
          goBackButton.addEventListener('click', () => {
            window.location.href = 'index.html';
          });
        }
      }
    });
  
  // Back button functionality
  const backButton = document.getElementById('back-button');
  if (backButton) {
    backButton.addEventListener('click', () => {
      window.history.back();
    });
  }
  
  // Display movie details
  function displayMovieDetails(movie) {
    // Set page title
    document.title = `${movie.title} - Adze.design`;
    
    // Update backdrop image
    const backdropElement = document.getElementById('movie-backdrop');
    backdropElement.style.backgroundImage = `url(${imageBaseUrl}${movie.backdrop_path})`;
    
    // Update poster image
    const posterElement = document.getElementById('movie-poster');
    posterElement.src = `${posterBaseUrl}${movie.poster_path}`;
    posterElement.alt = movie.title;
    
    // Update title and meta information
    document.getElementById('movie-title').textContent = movie.title;
    
    // Get release year
    const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
    document.getElementById('movie-year').textContent = releaseYear;
    
    // Format runtime
    const hours = Math.floor(movie.runtime / 60);
    const minutes = movie.runtime % 60;
    document.getElementById('movie-runtime').textContent = `${hours}h ${minutes}m`;
    
    // Update rating
    document.getElementById('movie-rating').innerHTML = `<i class="fas fa-star"></i> ${movie.vote_average.toFixed(1)}`;
    
    // Update genres
    const genresElement = document.getElementById('movie-genres');
    genresElement.innerHTML = '';
    
    movie.genres.forEach(genre => {
      const genreTag = document.createElement('div');
      genreTag.className = 'genre-tag';
      genreTag.textContent = genre.name;
      genresElement.appendChild(genreTag);
    });
    
    // Update overview
    document.getElementById('movie-overview').textContent = movie.overview;
    
    // Set up play button event
    const playButton = document.querySelector('.play-button');
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
          // Navigate to the movie-watch page
          window.location.href = `movie-watch.html?id=${movie.id}`;
          
          // Broadcast that you're watching this movie
          if (room) {
            room.send({
              type: "watching",
              movieId: movie.id.toString(),
              movieTitle: movie.title,
              username: username || "User"
            });
          }
        }
      });
    }
    
    // Set up trailer button event
    const trailerButton = document.querySelector('.trailer-button');
    if (trailerButton && movie.videos && movie.videos.results) {
      // Find trailer
      const trailer = movie.videos.results.find(video => 
        video.type === 'Trailer' && video.site === 'YouTube'
      );
      
      if (trailer) {
        trailerButton.addEventListener('click', function() {
          // Navigate to the trailer-view page
          window.location.href = `trailer-view.html?id=${movie.id}&type=movie&key=${trailer.key}`;
        });
      } else {
        trailerButton.disabled = true;
        trailerButton.innerHTML = '<i class="fas fa-film"></i> No Trailer';
        trailerButton.style.opacity = '0.5';
      }
    }
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
      
      castContainer.appendChild(castCard);
    });
    
    // If no cast members are available
    if (mainCast.length === 0) {
      castContainer.innerHTML = '<p class="no-data">No cast information available</p>';
    }
  }
  
  // Display similar movies
  function displaySimilarMovies(similar) {
    const similarContainer = document.getElementById('similar-movies-container');
    
    // Clear loading message
    similarContainer.innerHTML = '';
    
    // Only show the first 4 similar movies
    const similarMovies = similar.results.slice(0, 4);
    
    similarMovies.forEach(movie => {
      const similarCard = document.createElement('div');
      similarCard.className = 'similar-movie-card';
      
      let posterUrl = movie.poster_path 
        ? `${posterBaseUrl}${movie.poster_path}`
        : 'https://via.placeholder.com/500x750?text=No+Image';
      
      // Get release year
      const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A';
      
      similarCard.innerHTML = `
        <div class="similar-movie-poster">
          <img src="${posterUrl}" alt="${movie.title}">
        </div>
        <div class="similar-movie-title">${movie.title}</div>
        <div class="similar-movie-meta">
          <div class="similar-movie-year">${releaseYear}</div>
          <div class="similar-movie-rating">
            <i class="fas fa-star"></i> ${movie.vote_average.toFixed(1)}
          </div>
        </div>
      `;
      
      similarCard.addEventListener('click', () => {
        window.location.href = `movie-view.html?id=${movie.id}`;
      });
      
      similarContainer.appendChild(similarCard);
    });
    
    // If no similar movies are available
    if (similarMovies.length === 0) {
      similarContainer.innerHTML = '<p class="no-data">No similar movies available</p>';
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
      // Get users who have watched this movie recently
      room.collection('watch_history')
        .filter({ content_type: 'movie', content_id: movieId })
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
  
  // Handle incoming WebsimSocket events
  if (room) {
    room.onmessage = (event) => {
      const data = event.data;
      
      if (data.type === "watching" && data.movieId === movieId) {
        console.log(`${data.username} started watching this movie too!`);
        
        // You could show a notification or update the UI
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
    };
  }
  
  // Add watchlist functionality to the movie-view page
  function setupAddToListButton(movie) {
    const addButton = document.querySelector('.add-button');
    if (addButton) {
      // Check if movie is already in watchlist
      const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
      const isInWatchlist = watchlist.some(item => item.id === movie.id.toString() && item.type === 'movie');
      
      // Update button state
      if (isInWatchlist) {
        addButton.innerHTML = '<i class="fas fa-check"></i> In Watchlist';
        addButton.classList.add('in-watchlist');
      }
      
      addButton.addEventListener('click', function() {
        if (this.classList.contains('in-watchlist')) {
          // Remove from watchlist
          removeFromWatchlist(movie.id.toString());
          this.innerHTML = '<i class="fas fa-plus"></i> Add to List';
          this.classList.remove('in-watchlist');
        } else {
          // Add to watchlist
          addToWatchlist(movie);
          this.innerHTML = '<i class="fas fa-check"></i> In Watchlist';
          this.classList.add('in-watchlist');
        }
      });
    }
  }

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
        poster: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
        rating: movie.vote_average.toFixed(1),
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
          poster_url: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
          added_at: new Date().toISOString()
        });
      }
      
      // Show notification
      showNotification(`Added "${movie.title}" to your watchlist`);
    }
  }

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
  
  // Add menu item event listeners
  document.addEventListener('DOMContentLoaded', function() {
    // Sidebar menu navigation
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
  });
});