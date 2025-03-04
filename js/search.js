document.addEventListener('DOMContentLoaded', function() {
  // TMDB API configuration
  const tmdbBaseUrl = 'https://api.themoviedb.org/3';
  const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
  const imageBaseUrl = 'https://image.tmdb.org/t/p/w500';
  
  // DOM elements
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search');
  const searchTitle = document.getElementById('search-title');
  const searchResults = document.getElementById('search-results');
  const resultsGrid = document.getElementById('results-grid');
  const searchPrompt = document.querySelector('.search-prompt');
  const loadingContainer = document.getElementById('search-loading');
  const noResults = document.getElementById('no-results');
  const paginationContainer = document.getElementById('pagination');
  const filterButtons = document.querySelectorAll('.filter-button');
  const backButton = document.getElementById('back-button');
  
  // State variables
  let currentSearch = '';
  let currentPage = 1;
  let totalPages = 0;
  let currentFilter = 'movie'; // Default filter
  let searchTimeout = null;
  
  // Initialize event listeners
  function init() {
    // Logo click to go home
    document.querySelector('.logo').addEventListener('click', function() {
      window.location.href = 'index.html';
    });
    
    // Search input event listener
    searchInput.addEventListener('input', function() {
      const query = this.value.trim();
      
      // Show/hide clear button based on input content
      clearSearchBtn.style.display = query ? 'block' : 'none';
      
      // Set a timeout to avoid searching on every keystroke
      clearTimeout(searchTimeout);
      if (query.length > 2) {
        searchTimeout = setTimeout(() => {
          if (query !== currentSearch) {
            currentSearch = query;
            currentPage = 1;
            performSearch(query);
          }
        }, 500);
      } else if (query.length === 0) {
        // Reset everything if search is cleared
        resetSearch();
      }
    });
    
    // Clear search button
    clearSearchBtn.addEventListener('click', function() {
      searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      resetSearch();
      searchInput.focus();
    });
    
    // Filter buttons
    filterButtons.forEach(button => {
      button.addEventListener('click', function() {
        const filter = this.dataset.filter;
        if (filter !== currentFilter) {
          filterButtons.forEach(btn => btn.classList.remove('active'));
          this.classList.add('active');
          currentFilter = filter;
          if (currentSearch) {
            currentPage = 1;
            performSearch(currentSearch);
          }
        }
      });
    });
    
    // Back button
    if (backButton) {
      backButton.addEventListener('click', function() {
        window.location.href = 'index.html';
      });
    }
    
    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const queryParam = urlParams.get('q');
    if (queryParam) {
      searchInput.value = queryParam;
      currentSearch = queryParam;
      clearSearchBtn.style.display = 'block';
      performSearch(queryParam);
      
      // Set filter if provided in URL
      const filterParam = urlParams.get('filter');
      if (filterParam && ['movie', 'tv', 'person'].includes(filterParam)) {
        filterButtons.forEach(btn => {
          btn.classList.toggle('active', btn.dataset.filter === filterParam);
        });
        currentFilter = filterParam;
      }
    }
  }
  
  // Reset search to initial state
  function resetSearch() {
    currentSearch = '';
    searchPrompt.style.display = 'flex';
    loadingContainer.style.display = 'none';
    resultsGrid.style.display = 'none';
    resultsGrid.innerHTML = '';
    noResults.style.display = 'none';
    paginationContainer.innerHTML = '';
    searchTitle.textContent = 'Search Results';
  }
  
  // Perform search using TMDB API
  function performSearch(query) {
    // Show loading state
    searchPrompt.style.display = 'none';
    loadingContainer.style.display = 'flex';
    resultsGrid.style.display = 'none';
    resultsGrid.innerHTML = '';
    noResults.style.display = 'none';
    
    // Update the title
    searchTitle.textContent = `Search Results for "${query}"`;
    
    // Determine which endpoint to use based on current filter
    let searchEndpoint;
    switch (currentFilter) {
      case 'movie':
        searchEndpoint = `${tmdbBaseUrl}/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${currentPage}`;
        break;
      case 'tv':
        searchEndpoint = `${tmdbBaseUrl}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${currentPage}`;
        break;
      case 'person':
        searchEndpoint = `${tmdbBaseUrl}/search/person?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${currentPage}`;
        break;
      default:
        searchEndpoint = `${tmdbBaseUrl}/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&page=${currentPage}`;
    }
    
    // Fetch search results
    fetch(searchEndpoint)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        // Hide loading indicator
        loadingContainer.style.display = 'none';
        
        // Update pagination state
        totalPages = data.total_pages > 20 ? 20 : data.total_pages; // Limit to 20 pages max
        
        // Display results or no results message
        if (data.results && data.results.length > 0) {
          displayResults(data.results, currentFilter);
          createPagination();
        } else {
          noResults.style.display = 'flex';
        }
      })
      .catch(error => {
        console.error('Error fetching search results:', error);
        loadingContainer.style.display = 'none';
        noResults.style.display = 'flex';
      });
  }
  
  // Display search results
  function displayResults(results, type) {
    resultsGrid.innerHTML = '';
    resultsGrid.style.display = 'grid';
    
    results.forEach(item => {
      // Create result card based on item type
      const resultCard = document.createElement('div');
      resultCard.className = `result-card ${type === 'person' ? 'person-result' : ''}`;
      
      // Set click handler to navigate to details page
      resultCard.addEventListener('click', () => {
        if (type === 'movie' || item.media_type === 'movie') {
          window.location.href = `movie-view.html?id=${item.id}`;
        } else if (type === 'tv' || item.media_type === 'tv') {
          window.location.href = `tv-view.html?id=${item.id}`;
        } else if (type === 'person' || item.media_type === 'person') {
          window.location.href = `person-view.html?id=${item.id}`;
        }
      });
      
      // Determine item details based on type
      let poster, title, year, rating, type_label, genres_or_known_for;
      
      if (type === 'person' || item.media_type === 'person') {
        poster = item.profile_path ? `${imageBaseUrl}${item.profile_path}` : 'https://via.placeholder.com/500x750?text=No+Image';
        title = item.name;
        type_label = 'Person';
        year = '';
        rating = '';
        
        // Known for section
        if (item.known_for && item.known_for.length > 0) {
          const known_for_titles = item.known_for.map(known => known.title || known.name).slice(0, 2);
          genres_or_known_for = `Known for: ${known_for_titles.join(', ')}`;
        } else {
          genres_or_known_for = item.known_for_department || '';
        }
      } else if (type === 'tv' || item.media_type === 'tv') {
        poster = item.poster_path ? `${imageBaseUrl}${item.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image';
        title = item.name;
        type_label = 'TV';
        year = item.first_air_date ? new Date(item.first_air_date).getFullYear() : '';
        rating = item.vote_average ? item.vote_average.toFixed(1) : '';
        genres_or_known_for = '';
      } else {
        poster = item.poster_path ? `${imageBaseUrl}${item.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Image';
        title = item.title;
        type_label = 'Movie';
        year = item.release_date ? new Date(item.release_date).getFullYear() : '';
        rating = item.vote_average ? item.vote_average.toFixed(1) : '';
        genres_or_known_for = '';
      }
      
      // If genres needed, would fetch them separately or use genre IDs with a lookup map
      
      // Construct card HTML
      resultCard.innerHTML = `
        <div class="result-poster">
          <img src="${poster}" alt="${title}">
          <div class="result-type">${type_label}</div>
        </div>
        <div class="result-info">
          <div class="result-title">${title}</div>
          <div class="result-meta">
            ${year ? `<div class="result-year">${year}</div>` : ''}
            ${rating ? `<div class="result-rating"><i class="fas fa-star"></i> ${rating}</div>` : ''}
          </div>
          <div class="${type === 'person' || item.media_type === 'person' ? 'result-known-for' : 'result-genres'}">
            ${genres_or_known_for}
          </div>
        </div>
      `;
      
      resultsGrid.appendChild(resultCard);
    });
  }
  
  // Create pagination controls
  function createPagination() {
    paginationContainer.innerHTML = '';
    
    // Don't show pagination if there's only one page
    if (totalPages <= 1) return;
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = `page-button ${currentPage === 1 ? 'disabled' : ''}`;
    prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        performSearch(currentSearch);
      }
    });
    paginationContainer.appendChild(prevButton);
    
    // Determine which page buttons to show
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // Adjust if we're near the end
    if (endPage === totalPages) {
      startPage = Math.max(1, endPage - 4);
    }
    
    // First page button if not starting at page 1
    if (startPage > 1) {
      const firstPageButton = document.createElement('button');
      firstPageButton.className = 'page-button';
      firstPageButton.textContent = '1';
      firstPageButton.addEventListener('click', () => {
        currentPage = 1;
        performSearch(currentSearch);
      });
      paginationContainer.appendChild(firstPageButton);
      
      // Ellipsis if there's a gap
      if (startPage > 2) {
        const ellipsis = document.createElement('div');
        ellipsis.className = 'page-button disabled';
        ellipsis.textContent = '...';
        paginationContainer.appendChild(ellipsis);
      }
    }
    
    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement('button');
      pageButton.className = `page-button ${i === currentPage ? 'active' : ''}`;
      pageButton.textContent = i;
      pageButton.addEventListener('click', () => {
        if (i !== currentPage) {
          currentPage = i;
          performSearch(currentSearch);
          // Scroll back to top of results
          searchResults.scrollIntoView({ behavior: 'smooth' });
        }
      });
      paginationContainer.appendChild(pageButton);
    }
    
    // Ellipsis and last page button if not ending at last page
    if (endPage < totalPages) {
      // Ellipsis if there's a gap
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('div');
        ellipsis.className = 'page-button disabled';
        ellipsis.textContent = '...';
        paginationContainer.appendChild(ellipsis);
      }
      
      // Last page button
      const lastPageButton = document.createElement('button');
      lastPageButton.className = 'page-button';
      lastPageButton.textContent = totalPages;
      lastPageButton.addEventListener('click', () => {
        currentPage = totalPages;
        performSearch(currentSearch);
      });
      paginationContainer.appendChild(lastPageButton);
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = `page-button ${currentPage === totalPages ? 'disabled' : ''}`;
    nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        performSearch(currentSearch);
        // Scroll back to top of results
        searchResults.scrollIntoView({ behavior: 'smooth' });
      }
    });
    paginationContainer.appendChild(nextButton);
  }
  
  // Initialize the search page
  init();
  
  // Connect search functionality to the search input in the top bar from any page
  // This function can be called from main.js
  window.setupGlobalSearch = function() {
    const globalSearchInput = document.querySelector('.search-container input');
    if (globalSearchInput && globalSearchInput.id !== 'search-input') {
      globalSearchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          const query = this.value.trim();
          if (query) {
            window.location.href = `search.html?q=${encodeURIComponent(query)}`;
          }
        }
      });
    }
  };
  
  // Call global search setup
  window.setupGlobalSearch();
});