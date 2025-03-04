document.addEventListener('DOMContentLoaded', function() {
  const tmdbBaseUrl = 'https://api.themoviedb.org/3';
  const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
  const imageBaseUrl = 'https://image.tmdb.org/t/p/original';
  const posterBaseUrl = 'https://image.tmdb.org/t/p/w500';

  // Store for featured movies
  let featuredMovies = [];
  let currentFeaturedIndex = 0;
  let featuredInterval;

  // Define the setupMovieCardListeners function
  window.setupMovieCardListeners = function() {
    // Add click listeners to all movie cards
    document.querySelectorAll('.movie-card').forEach(card => {
      card.addEventListener('click', function() {
        const movieId = this.dataset.movieId;
        if (movieId) {
          window.location.href = `movie-view.html?id=${movieId}`;
        }
      });
    });
  };

  // Also define setupContinueWatchingListeners
  window.setupContinueWatchingListeners = function() {
    document.querySelectorAll('.continue-card').forEach(card => {
      card.addEventListener('click', function() {
        const movieId = this.dataset.movieId;
        if (movieId) {
          window.location.href = `movie-view.html?id=${movieId}`;
        }
      });
    });
  };

  // Fetch top 5 popular movies for the featured section
  fetch(`${tmdbBaseUrl}/movie/popular?api_key=${apiKey}&page=1`)
    .then(response => response.json())
    .then(data => {
      // Store the top 5 movies
      featuredMovies = data.results.slice(0, 7);
      
      // Setup featured movie carousel
      setupFeaturedCarousel(featuredMovies);
    })
    .catch(error => {
      console.error('Error fetching popular movies:', error);
      
      // Fallback to the provided image if API request fails
      const featuredMovie = document.getElementById('featured-movie');
      featuredMovie.style.backgroundImage = `url('/a/78fb05a0-26e4-4517-99e0-d879a2371fe5')`;
      
      // Create a default featured movie
      featuredMovies = [{
        id: 76600,
        title: 'AVATAR: THE WAY OF WATER',
        tagline: 'RETURN TO PANDORA.',
        vote_average: 7.6,
        backdrop_path: '/8rpDcsfLJypbO6vREc0547VKqEv.jpg'
      }];
      setupFeaturedCarousel(featuredMovies);
    });

  // Setup featured movie carousel
  function setupFeaturedCarousel(movies) {
    const featuredMovie = document.getElementById('featured-movie');
    const dotsContainer = document.getElementById('featured-dots');
    
    // If these elements don't exist, we're probably on a different page
    if (!featuredMovie || !dotsContainer) return;
    
    // Create dots for navigation
    dotsContainer.innerHTML = '';
    movies.forEach((movie, index) => {
      const dot = document.createElement('div');
      dot.className = `dot ${index === 0 ? 'active' : ''}`;
      dot.dataset.index = index;
      dot.addEventListener('click', () => {
        clearInterval(featuredInterval);
        displayFeaturedMovie(index);
        startFeaturedCarousel();
      });
      dotsContainer.appendChild(dot);
    });
    
    // Display the first movie
    displayFeaturedMovie(0);
    
    // Start the carousel
    startFeaturedCarousel();
  }

  // Display a featured movie by index
  function displayFeaturedMovie(index) {
    currentFeaturedIndex = index;
    const movie = featuredMovies[index];
    const featuredMovie = document.getElementById('featured-movie');
    
    // If element doesn't exist, return
    if (!featuredMovie) return;
    
    // Update dots
    const dots = document.querySelectorAll('.dot');
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
    
    // Fade out current content
    const featuredContent = featuredMovie.querySelector('.featured-content');
    featuredContent.classList.add('fade-out');
    
    setTimeout(() => {
      // Update the background image
      featuredMovie.style.backgroundImage = `url(${imageBaseUrl}${movie.backdrop_path})`;
      
      // Update title and subtitle
      const titleElement = featuredContent.querySelector('h1');
      titleElement.textContent = movie.title.toUpperCase();
      
      const subtitleElement = featuredContent.querySelector('h2');
      subtitleElement.textContent = movie.tagline || movie.overview.split('.')[0].toUpperCase();
      
      // Update rating
      const ratingElement = featuredContent.querySelector('.movie-rating');
      if (ratingElement) {
        ratingElement.innerHTML = `<i class="fas fa-star"></i> ${movie.vote_average.toFixed(1)}`;
      }
      
      // Fade in updated content
      featuredContent.classList.remove('fade-out');
      featuredContent.classList.add('fade-in');
      
      setTimeout(() => {
        featuredContent.classList.remove('fade-in');
      }, 500);
    }, 300);
  }

  // Start automatic carousel
  function startFeaturedCarousel() {
    clearInterval(featuredInterval);
    featuredInterval = setInterval(() => {
      let nextIndex = (currentFeaturedIndex + 1) % featuredMovies.length;
      displayFeaturedMovie(nextIndex);
    }, 2500); // Rotate every 2.5 seconds
  }

  // Fetch popular movies for the Parties section
  fetch(`${tmdbBaseUrl}/discover/movie?api_key=${apiKey}&sort_by=popularity.desc&page=1`)
    .then(response => response.json())
    .then(data => {
      const partiesContainer = document.getElementById('parties-container');

      // If this element doesn't exist, we're probably on a different page
      if (!partiesContainer) return;

      // Clear any existing content
      partiesContainer.innerHTML = '';

      // Take only first 4 movies for the Parties section
      const partyMovies = data.results.slice(0, 4);

      // Generate movie cards for Parties section
      partyMovies.forEach((movie, index) => {
        // Get genres for the movie
        fetch(`${tmdbBaseUrl}/movie/${movie.id}?api_key=${apiKey}`)
          .then(response => response.json())
          .then(movieDetails => {
            // Format genres as a string
            const genreNames = movieDetails.genres.map(genre => genre.name).slice(0, 2);
            const genresString = genreNames.join(', ');

            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card';
            movieCard.dataset.movieId = movie.id; // Store the movie ID for navigation
            movieCard.innerHTML = `
              <div class="movie-poster">
                <img src="${posterBaseUrl}${movie.poster_path}" alt="${movie.title}">
              </div>
              <div class="movie-watchers">
                <div class="watcher-avatars" id="watcher-avatars-${index}">
                  <!-- Will be populated by websim followers -->
                </div>
              </div>
              <div class="movie-title">${movie.title}</div>
              <div class="movie-genres">${genresString}</div>
            `;
            partiesContainer.appendChild(movieCard);

            // Add watchers from websim followers later in websim.js
          })
          .catch(error => {
            console.error(`Error fetching details for movie ${movie.id}:`, error);

            // Create card with partial info as fallback
            const movieCard = document.createElement('div');
            movieCard.className = 'movie-card';
            movieCard.dataset.movieId = movie.id; // Store the movie ID for navigation
            movieCard.innerHTML = `
              <div class="movie-poster">
                <img src="${posterBaseUrl}${movie.poster_path}" alt="${movie.title}">
              </div>
              <div class="movie-watchers">
                <div class="watcher-avatars" id="watcher-avatars-${index}">
                  <!-- Will be populated by websim followers -->
                </div>
              </div>
              <div class="movie-title">${movie.title}</div>
              <div class="movie-genres">Movie</div>
            `;
            partiesContainer.appendChild(movieCard);
          });
      });

      // Setup event listeners for the movie cards
      setTimeout(() => {
        window.setupMovieCardListeners();
      }, 1000);
    })
    .catch(error => {
      console.error('Error fetching party movies:', error);
      const partiesContainer = document.getElementById('parties-container');
      if (partiesContainer) {
        partiesContainer.innerHTML = '<div class="error-message">Unable to load movies. Please try again later.</div>';
      }
    });

  // Fetch top rated movies for the Continue Watching section
  // Using poster images instead of backdrop images for portrait display
  fetch(`${tmdbBaseUrl}/movie/top_rated?api_key=${apiKey}&page=1`)
    .then(response => response.json())
    .then(data => {
      const continueWatchingContainer = document.getElementById('continue-watching-container');

      // If this element doesn't exist, we're probably on a different page
      if (!continueWatchingContainer) return;

      // Clear any existing content
      continueWatchingContainer.innerHTML = '';

      // Generate continue watching cards using top rated movies
      for (let i = 0; i < 4; i++) {
        const movie = data.results[i];

        // Create each continue watching card with proper movie info
        const continueCard = document.createElement('div');
        continueCard.className = 'continue-card';
        continueCard.dataset.movieId = movie.id; // Store the movie ID for navigation

        // Use poster_path (portrait) instead of backdrop_path
        continueCard.innerHTML = `
          <img src="${posterBaseUrl}${movie.poster_path}" alt="${movie.title}">
          <div class="continue-info">
            <div class="continue-title">${movie.title}</div>
            <div class="continue-progress">
              <div class="progress-bar">
                <div class="progress" style="width: ${Math.floor(Math.random() * 90) + 10}%"></div>
              </div>
              <span>${Math.floor(Math.random() * 60) + 30} min left</span>
            </div>
          </div>
        `;
        continueWatchingContainer.appendChild(continueCard);
      }

      // Setup event listeners for the continue watching cards
      window.setupContinueWatchingListeners();
    })
    .catch(error => {
      console.error('Error fetching continue watching movies:', error);
      const continueWatchingContainer = document.getElementById('continue-watching-container');
      if (continueWatchingContainer) {
        continueWatchingContainer.innerHTML = '<div class="error-message">Unable to load movies. Please try again later.</div>';
      }
    });
    
  // Update watch button event to use the current featured movie
  window.setWatchButtonEvent = function() {
    const watchButton = document.querySelector('.watch-button');
    if (watchButton) {
      watchButton.addEventListener('click', function() {
        const currentMovie = featuredMovies[currentFeaturedIndex];
        
        // Check if user is following Brian_luceca before watching
        if (window.showFollowModal) {
          window.showFollowModal(function() {
            // This function runs after following or if already following
            proceedToWatch();
          });
        } else {
          proceedToWatch();
        }
        
        function proceedToWatch() {
          // Broadcast that you're watching this movie
          if (window.room) {
            window.room.send({
              type: "watching",
              movieId: currentMovie.id.toString(),
              movieTitle: currentMovie.title,
              username: window.username || "User"
            });
          }
          
          // Navigate to movie view page for featured movie
          window.location.href = `movie-view.html?id=${currentMovie.id}`;
        }
      });
    }
  };
});