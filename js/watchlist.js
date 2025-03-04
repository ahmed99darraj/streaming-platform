document.addEventListener('DOMContentLoaded', function() {
  // TMDB API Configuration
  const tmdbBaseUrl = 'https://api.themoviedb.org/3';
  const apiKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
  
  // DOM elements
  const watchlistGrid = document.getElementById('watchlist-grid');
  const emptyWatchlist = document.getElementById('empty-watchlist');
  const watchlistCount = document.getElementById('watchlist-count');
  const searchInput = document.querySelector('.search-container input');
  const backButton = document.getElementById('back-button');
  
  // Initialize WebsimSocket connection for watchlist functionality
  let room;
  
  if (window.WebsimSocket) {
    room = new WebsimSocket();
    
    // Subscribe to watchlist changes
    room.collection('watchlist').subscribe(function(items) {
      // If we're using WebsimSocket persistence, sync with local storage
      syncWebsimWatchlistToLocal(items);
      refreshWatchlist();
    });
  }
  
  // Initialize event listeners
  function init() {
    // Back button
    if (backButton) {
      backButton.addEventListener('click', function() {
        window.location.href = 'index.html';
      });
    }
    
    // Search input
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        filterWatchlist(this.value.trim().toLowerCase());
      });
    }
    
    // Sidebar menu items
    document.querySelectorAll('.sidebar-menu li').forEach(item => {
      item.addEventListener('click', function() {
        if (!this.classList.contains('active')) {
          if (this.textContent.trim() === 'Browse') {
            window.location.href = 'browse.html';
          } else if (this.textContent.trim() === 'Coming Soon') {
            window.location.href = 'coming-soon.html';
          }
        }
      });
    });
    
    // Mobile sidebar close button
    const closeSidebarBtn = document.getElementById('close-sidebar');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (closeSidebarBtn && sidebar && overlay) {
      closeSidebarBtn.addEventListener('click', function() {
        sidebar.classList.remove('sidebar-open');
        overlay.style.display = 'none';
        document.body.style.overflow = ''; // Allow scrolling again
      });
    }
    
    // Logo click to go home
    document.querySelector('.logo').addEventListener('click', function() {
      window.location.href = 'index.html';
    });
    
    // Load watchlist
    refreshWatchlist();
  }
  
  // Sync WebsimSocket watchlist to local storage
  function syncWebsimWatchlistToLocal(websimItems) {
    // Only proceed if we have items from WebsimSocket
    if (!websimItems || websimItems.length === 0) return;
    
    // Get local watchlist
    let localWatchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    
    // Convert WebsimSocket items to local format
    const websimConverted = websimItems.map(item => ({
      id: item.content_id,
      type: item.content_type,
      title: item.title,
      poster: item.poster_url,
      dateAdded: item.added_at
    }));
    
    // Merge lists, preferring WebsimSocket items in case of duplicates
    const mergedList = [];
    const seenIds = new Set();
    
    // Add WebsimSocket items first
    websimConverted.forEach(item => {
      mergedList.push(item);
      seenIds.add(`${item.id}-${item.type}`);
    });
    
    // Add local items that aren't in WebsimSocket
    localWatchlist.forEach(item => {
      if (!seenIds.has(`${item.id}-${item.type}`)) {
        mergedList.push(item);
      }
    });
    
    // Save merged list back to local storage
    localStorage.setItem('watchlist', JSON.stringify(mergedList));
  }
  
  // Filter watchlist items based on search term
  function filterWatchlist(searchTerm) {
    const items = document.querySelectorAll('.movie-item');
    let visibleCount = 0;
    
    items.forEach(item => {
      const title = item.querySelector('.movie-title').textContent.toLowerCase();
      const genres = item.querySelector('.movie-genres')?.textContent.toLowerCase() || '';
      
      if (title.includes(searchTerm) || genres.includes(searchTerm)) {
        item.style.display = '';
        visibleCount++;
      } else {
        item.style.display = 'none';
      }
    });
    
    // Show/hide empty state
    if (visibleCount === 0 && items.length > 0) {
      emptyWatchlist.style.display = 'flex';
      emptyWatchlist.querySelector('h2').textContent = 'No matches found';
      emptyWatchlist.querySelector('p').textContent = 'Try a different search term';
    } else {
      emptyWatchlist.style.display = items.length === 0 ? 'flex' : 'none';
      emptyWatchlist.querySelector('h2').textContent = 'Your watchlist is empty';
      emptyWatchlist.querySelector('p').textContent = 'Add movies and TV shows to your watchlist to keep track of what you want to watch.';
    }
    
    // Update count
    watchlistCount.textContent = `${visibleCount} ${visibleCount === 1 ? 'item' : 'items'}`;
  }
  
  // Refresh the watchlist UI
  function refreshWatchlist() {
    // Get watchlist from local storage
    const watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    
    // Clear current grid
    watchlistGrid.innerHTML = '';
    
    // Show empty state if watchlist is empty
    if (watchlist.length === 0) {
      emptyWatchlist.style.display = 'flex';
      watchlistCount.textContent = '0 items';
      return;
    }
    
    // Hide empty state
    emptyWatchlist.style.display = 'none';
    
    // Update count
    watchlistCount.textContent = `${watchlist.length} ${watchlist.length === 1 ? 'item' : 'items'}`;
    
    // Sort by most recently added
    watchlist.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    
    // Display watchlist items
    watchlist.forEach(item => {
      const itemElement = createWatchlistItem(item);
      watchlistGrid.appendChild(itemElement);
    });
    
    // Setup remove buttons
    setupRemoveButtons();
  }
  
  // Create a watchlist item element
  function createWatchlistItem(item) {
    const itemContainer = document.createElement('div');
    itemContainer.className = 'movie-item';
    itemContainer.dataset.id = item.id;
    itemContainer.dataset.type = item.type;
    
    // Format dates and details
    const formattedDate = new Date(item.dateAdded).toLocaleDateString();
    
    // Use stored values or default placeholders
    const poster = item.poster || 'https://via.placeholder.com/500x750?text=No+Image';
    const rating = item.rating || 'N/A';
    const year = item.year || '';
    
    // Construct item HTML
    itemContainer.innerHTML = `
      <div class="movie-poster">
        <img src="${poster}" alt="${item.title}">
        <div class="content-type">${item.type === 'movie' ? 'Movie' : 'TV'}</div>
        <button class="remove-button" data-id="${item.id}" data-type="${item.type}">
          <i class="fas fa-heart"></i>
        </button>
      </div>
      <div class="movie-info">
        <div class="movie-title">${item.title}</div>
        <div class="movie-meta">
          <div class="movie-year">${year}</div>
          <div class="movie-rating"><i class="fas fa-star"></i> ${rating}</div>
        </div>
        <div class="movie-genres">Added on ${formattedDate}</div>
      </div>
    `;
    
    // Add click listener to navigate to details
    itemContainer.addEventListener('click', function(e) {
      // Don't trigger navigation if the remove button was clicked
      if (e.target.closest('.remove-button')) return;
      
      if (item.type === 'movie') {
        window.location.href = `movie-view.html?id=${item.id}`;
      } else if (item.type === 'tv') {
        // Navigate to the TV show view page
        window.location.href = `tv-view.html?id=${item.id}`;
      }
    });
    
    return itemContainer;
  }
  
  // Setup remove buttons
  function setupRemoveButtons() {
    const removeButtons = document.querySelectorAll('.remove-button');
    
    removeButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.stopPropagation();
        
        const id = this.dataset.id;
        const type = this.dataset.type;
        const itemElement = this.closest('.movie-item');
        
        // Animate removal
        itemElement.classList.add('fadeOut');
        
        // Remove from watchlist after animation
        setTimeout(() => {
          removeFromWatchlist(id, type);
          itemElement.remove();
          
          // Update count
          const count = document.querySelectorAll('.movie-item').length;
          watchlistCount.textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
          
          // Show empty state if needed
          if (count === 0) {
            emptyWatchlist.style.display = 'flex';
          }
        }, 300);
      });
    });
  }
  
  // Remove item from watchlist
  function removeFromWatchlist(id, type) {
    // Get existing watchlist
    let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');
    
    // Find the item for notification
    const itemToRemove = watchlist.find(item => item.id === id && item.type === type);
    
    // Remove the item
    watchlist = watchlist.filter(item => !(item.id === id && item.type === type));
    
    // Save to local storage
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
    
    // If using WebsimSocket, remove from room collection
    if (room) {
      // Get all watchlist records
      const watchlistItems = room.collection('watchlist').filter({ content_id: id, content_type: type }).getList();
      
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
  
  // Initialize the page
  init();
});