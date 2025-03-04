document.addEventListener('DOMContentLoaded', function() {
  // Get personId from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const personId = urlParams.get('id');
  
  if (!personId) {
    // If no person ID is provided, redirect back to browse
    window.location.href = 'browse.html';
    return;
  }
  
  // TMDB API configuration
  const tmdbBaseUrl = 'https://api.themoviedb.org/3';
  const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
  const profileBaseUrl = 'https://image.tmdb.org/t/p/w300';
  const posterBaseUrl = 'https://image.tmdb.org/t/p/w500';
  
  // State variables
  let allCredits = [];
  let displayedCredits = [];
  let currentDisplayCount = 0;
  let itemsPerPage = 10;
  let currentFilter = 'all';
  
  // Initialize page
  function init() {
    // Set up back button
    const backButton = document.getElementById('back-button');
    if (backButton) {
      backButton.addEventListener('click', () => {
        window.history.back();
      });
    }
    
    // Logo click to go home
    document.querySelector('.logo').addEventListener('click', function() {
      window.location.href = 'index.html';
    });
    
    // Set up filter buttons
    document.querySelectorAll('.filmography-filters .filter-button').forEach(button => {
      button.addEventListener('click', function() {
        if (!this.classList.contains('active')) {
          // Update active button
          document.querySelectorAll('.filmography-filters .filter-button').forEach(btn => {
            btn.classList.remove('active');
          });
          this.classList.add('active');
          
          // Update filter and refresh displayed credits
          currentFilter = this.dataset.type;
          currentDisplayCount = 0;
          filterAndDisplayCredits();
        }
      });
    });
    
    // Set up load more button
    const loadMoreButton = document.getElementById('load-more-button');
    loadMoreButton.addEventListener('click', loadMoreCredits);
    
    // Load person data
    fetchPersonDetails();
  }
  
  // Fetch person details
  function fetchPersonDetails() {
    fetch(`${tmdbBaseUrl}/person/${personId}?api_key=${apiKey}&append_to_response=combined_credits,external_ids`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Person not found');
        }
        return response.json();
      })
      .then(data => {
        // Display person information
        displayPersonInfo(data);
        
        // Process and store all credits
        processCredits(data.combined_credits);
        
        // Initial display of credits
        filterAndDisplayCredits();
      })
      .catch(error => {
        console.error('Error fetching person details:', error);
        handleError(error.message);
      });
  }
  
  // Display person information
  function displayPersonInfo(person) {
    // Set page title
    document.title = `${person.name} - Adze.design`;
    
    // Update profile image
    const profileElement = document.getElementById('person-profile');
    if (person.profile_path) {
      profileElement.src = `${profileBaseUrl}${person.profile_path}`;
    } else {
      profileElement.src = 'https://via.placeholder.com/300x450?text=No+Image';
    }
    profileElement.alt = person.name;
    
    // Update name
    document.getElementById('person-name').textContent = person.name;
    
    // Update birthday if available
    const birthdayElement = document.getElementById('person-birthday');
    if (person.birthday) {
      const birthDate = new Date(person.birthday);
      const formattedBirthday = birthDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
      
      // Calculate age if death date isn't available
      let ageText = '';
      if (!person.deathday) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        ageText = ` (${age} years old)`;
      }
      
      birthdayElement.querySelector('span').textContent = `${formattedBirthday}${ageText}`;
    } else {
      birthdayElement.style.display = 'none';
    }
    
    // Update place of birth if available
    const birthPlaceElement = document.getElementById('person-place-of-birth');
    if (person.place_of_birth) {
      birthPlaceElement.querySelector('span').textContent = person.place_of_birth;
    } else {
      birthPlaceElement.style.display = 'none';
    }
    
    // Update known for department
    const knownForElement = document.getElementById('person-known-for');
    if (person.known_for_department) {
      knownForElement.querySelector('span').textContent = person.known_for_department;
    } else {
      knownForElement.style.display = 'none';
    }
    
    // Update biography
    const bioElement = document.getElementById('person-bio');
    if (person.biography) {
      // If biography is long, add read more functionality
      if (person.biography.length > 600) {
        const shortBio = person.biography.substring(0, 600) + '...';
        bioElement.innerHTML = `
          <span id="short-bio">${shortBio} <span class="read-more-toggle" id="read-more">Read More</span></span>
          <span id="full-bio" style="display: none;">${person.biography} <span class="read-more-toggle" id="read-less">Read Less</span></span>
        `;
        
        // Add event listeners for read more/less toggles
        document.getElementById('read-more').addEventListener('click', function() {
          document.getElementById('short-bio').style.display = 'none';
          document.getElementById('full-bio').style.display = 'inline';
        });
        
        document.getElementById('read-less').addEventListener('click', function() {
          document.getElementById('short-bio').style.display = 'inline';
          document.getElementById('full-bio').style.display = 'none';
        });
      } else {
        bioElement.textContent = person.biography;
      }
    } else {
      bioElement.textContent = 'No biography available.';
    }
    
    // Add social media links if available
    const socialLinksContainer = document.getElementById('person-social-links');
    const externalIds = person.external_ids;
    
    // Clear existing content
    socialLinksContainer.innerHTML = '';
    
    // Check for each possible social media
    if (externalIds.instagram_id) {
      addSocialLink(socialLinksContainer, 'instagram', externalIds.instagram_id);
    }
    
    if (externalIds.twitter_id) {
      addSocialLink(socialLinksContainer, 'twitter', externalIds.twitter_id);
    }
    
    if (externalIds.facebook_id) {
      addSocialLink(socialLinksContainer, 'facebook', externalIds.facebook_id);
    }
    
    if (externalIds.imdb_id) {
      addSocialLink(socialLinksContainer, 'imdb', externalIds.imdb_id);
    }
    
    // Hide container if no social links are added
    if (socialLinksContainer.children.length === 0) {
      socialLinksContainer.style.display = 'none';
    }
  }
  
  // Add a social media link
  function addSocialLink(container, platform, id) {
    let url, icon;
    
    switch (platform) {
      case 'instagram':
        url = `https://instagram.com/${id}`;
        icon = 'fab fa-instagram';
        break;
      case 'twitter':
        url = `https://twitter.com/${id}`;
        icon = 'fab fa-twitter';
        break;
      case 'facebook':
        url = `https://facebook.com/${id}`;
        icon = 'fab fa-facebook-f';
        break;
      case 'imdb':
        url = `https://www.imdb.com/name/${id}`;
        icon = 'fab fa-imdb';
        break;
      default:
        return;
    }
    
    const link = document.createElement('a');
    link.href = url;
    link.className = 'social-link';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.innerHTML = `<i class="${icon}"></i>`;
    
    container.appendChild(link);
  }
  
  // Process and prepare credits data
  function processCredits(credits) {
    // Get all movie and TV credits
    let movieCredits = credits.cast.filter(item => item.media_type === 'movie') || [];
    let tvCredits = credits.cast.filter(item => item.media_type === 'tv') || [];
    
    // Add crew credits if significant roles (director, producer, writer)
    if (credits.crew) {
      const significantRoles = ['Director', 'Producer', 'Executive Producer', 'Writer', 'Creator'];
      
      const significantMovieCrew = credits.crew
        .filter(item => 
          item.media_type === 'movie' && 
          significantRoles.includes(item.job)
        )
        .map(item => ({
          ...item,
          character: item.job // Use job as character for crew credits
        }));
      
      const significantTVCrew = credits.crew
        .filter(item => 
          item.media_type === 'tv' && 
          significantRoles.includes(item.job)
        )
        .map(item => ({
          ...item,
          character: item.job // Use job as character for crew credits
        }));
      
      // Add crew credits to the cast
      movieCredits = [...movieCredits, ...significantMovieCrew];
      tvCredits = [...tvCredits, ...significantTVCrew];
    }
    
    // Sort both arrays by popularity
    movieCredits.sort((a, b) => b.popularity - a.popularity);
    tvCredits.sort((a, b) => b.popularity - a.popularity);
    
    // Store all credits
    allCredits = [...movieCredits, ...tvCredits];
  }
  
  // Filter and display credits
  function filterAndDisplayCredits() {
    const filmographyGrid = document.getElementById('filmography-grid');
    const loadMoreContainer = document.getElementById('load-more-container');
    
    // Clear existing content
    if (currentDisplayCount === 0) {
      filmographyGrid.innerHTML = '';
    }
    
    // Filter credits based on current filter
    let filteredCredits;
    
    switch (currentFilter) {
      case 'movie':
        filteredCredits = allCredits.filter(credit => credit.media_type === 'movie');
        break;
      case 'tv':
        filteredCredits = allCredits.filter(credit => credit.media_type === 'tv');
        break;
      default:
        filteredCredits = allCredits;
    }
    
    // Store filtered credits for pagination
    displayedCredits = filteredCredits;
    
    // Show message if no credits match the filter
    if (filteredCredits.length === 0) {
      filmographyGrid.innerHTML = `
        <div class="loading-container">
          <p>No ${currentFilter === 'movie' ? 'movie' : currentFilter === 'tv' ? 'TV show' : ''} credits found.</p>
        </div>
      `;
      loadMoreContainer.style.display = 'none';
      return;
    }
    
    // Get the next batch of credits to display
    const nextBatch = filteredCredits.slice(currentDisplayCount, currentDisplayCount + itemsPerPage);
    
    // Create credit cards
    nextBatch.forEach(credit => {
      const creditCard = createCreditCard(credit);
      filmographyGrid.appendChild(creditCard);
    });
    
    // Update the display count
    currentDisplayCount += nextBatch.length;
    
    // Show/hide load more button
    loadMoreContainer.style.display = currentDisplayCount < filteredCredits.length ? 'flex' : 'none';
  }
  
  // Create a credit card
  function createCreditCard(credit) {
    const card = document.createElement('div');
    card.className = 'credit-card';
    
    // Determine title and year
    const title = credit.media_type === 'movie' ? credit.title : credit.name;
    const dateField = credit.media_type === 'movie' ? credit.release_date : credit.first_air_date;
    const year = dateField ? new Date(dateField).getFullYear() : 'N/A';
    
    // Get poster or use placeholder
    const posterPath = credit.poster_path 
      ? `${posterBaseUrl}${credit.poster_path}` 
      : 'https://via.placeholder.com/500x750?text=No+Image';
    
    // Determine character or job
    const character = credit.character || 'Unknown Role';
    
    card.innerHTML = `
      <div class="credit-poster">
        <img src="${posterPath}" alt="${title}">
        <div class="content-type-badge">${credit.media_type === 'movie' ? 'Movie' : 'TV'}</div>
        <div class="character-badge">${character}</div>
      </div>
      <div class="credit-info">
        <div class="credit-title">${title}</div>
        <div class="credit-meta">
          <div class="credit-year">${year}</div>
          <div class="credit-rating">
            <i class="fas fa-star"></i> ${credit.vote_average ? credit.vote_average.toFixed(1) : 'N/A'}
          </div>
        </div>
      </div>
    `;
    
    // Add click event to navigate to movie or TV show
    card.addEventListener('click', () => {
      if (credit.media_type === 'movie') {
        window.location.href = `movie-view.html?id=${credit.id}`;
      } else {
        window.location.href = `tv-view.html?id=${credit.id}`;
      }
    });
    
    return card;
  }
  
  // Load more credits
  function loadMoreCredits() {
    const loadMoreButton = document.getElementById('load-more-button');
    
    // Show loading state
    loadMoreButton.classList.add('loading');
    loadMoreButton.innerHTML = '<div class="spinner-small"></div> Loading...';
    
    // Simulate a delay for better user experience
    setTimeout(() => {
      // Display next batch of credits
      filterAndDisplayCredits();
      
      // Reset button
      loadMoreButton.classList.remove('loading');
      loadMoreButton.innerHTML = 'Load More';
    }, 500);
  }
  
  // Handle errors
  function handleError(message) {
    const content = document.querySelector('.person-view-content');
    
    if (content) {
      content.innerHTML = `
        <div class="error-container">
          <h2>Error Loading Person Details</h2>
          <p>${message}</p>
          <button id="go-back-button" class="go-back-button">Go Back</button>
        </div>
      `;
      
      const goBackButton = document.getElementById('go-back-button');
      if (goBackButton) {
        goBackButton.addEventListener('click', () => {
          window.history.back();
        });
      }
    }
  }
  
  // Initialize the page
  init();
});