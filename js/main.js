// At the top of the file after DOMContentLoaded
let currentUser = null;

// Initialize WebsimSocket and check user status
async function initializeUser() {
  try {
    // Create room connection
    if (window.WebsimSocket) {
      const room = new WebsimSocket();
      window.room = room;
      
      // Subscribe to user's party info to get username
      room.party.subscribe((peers) => {
        currentUser = {
          id: room.party.client.id,
          username: room.party.client.username
        };
        updateUserProfile(currentUser);
      });
    }
  } catch (error) {
    console.error('Error initializing WebsimSocket:', error);
  }
}

// Update user profile in nav bar 
function updateUserProfile(user) {
  const userProfileButton = document.getElementById('user-profile');
  if (userProfileButton) {
    if (user && user.username) {
      // Set avatar and click handler
      userProfileButton.innerHTML = `
        <img src="https://images.websim.ai/avatar/${user.username}" alt="${user.username}'s profile">
      `;
      
      // Add click handler to navigate to profile
      userProfileButton.addEventListener('click', () => {
        window.location.href = `user-profile.html?username=${user.username}`;
      });
    } else {
      // Show default avatar
      userProfileButton.innerHTML = `
        <img src="https://via.placeholder.com/32x32" alt="User profile">
      `;
    }
  }
}

// Make currentUser available globally
window.getCurrentUser = () => currentUser;

// Call initializeUser after DOM content loads
document.addEventListener('DOMContentLoaded', function() {
  // Initialize user data
  initializeUser();
  
  // Logo click to go home
  document.querySelector('.logo').addEventListener('click', function() {
    window.location.href = 'index.html';
  });
  
  // Mobile sidebar functionality
  const menuButton = document.getElementById('menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  
  // Toggle sidebar for mobile view
  if (menuButton) {
    menuButton.addEventListener('click', function() {
      sidebar.classList.toggle('sidebar-open');
      
      // Show/hide overlay
      if (overlay) {
        if (sidebar.classList.contains('sidebar-open')) {
          overlay.style.display = 'block';
          document.body.style.overflow = 'hidden'; // Prevent scrolling when sidebar is open
        } else {
          overlay.style.display = 'none';
          document.body.style.overflow = ''; // Allow scrolling again
        }
      }
    });
  }
  
  // Close sidebar when clicking on overlay
  if (overlay) {
    overlay.addEventListener('click', function() {
      sidebar.classList.remove('sidebar-open');
      overlay.style.display = 'none';
      document.body.style.overflow = ''; // Allow scrolling again
    });
  }
  
  // Sidebar menu item click handler - updated to navigate to proper pages
  const sidebarMenuItems = document.querySelectorAll('.sidebar-menu li');
  sidebarMenuItems.forEach(item => {
    item.addEventListener('click', function() {
      const menuText = this.textContent.trim();
      
      if (menuText === 'Browse' && !window.location.href.includes('browse.html')) {
        window.location.href = 'browse.html';
      } else if (menuText === 'Watchlist' && !window.location.href.includes('watchlist.html')) {
        window.location.href = 'watchlist.html';
      } else if (menuText === 'Coming Soon' && !window.location.href.includes('coming-soon.html')) {
        window.location.href = 'coming-soon.html';
      } else {
        // Just update active state if already on the page
        sidebarMenuItems.forEach(item => item.classList.remove('active'));
        this.classList.add('active');
      }
      
      // On mobile, close sidebar after clicking
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('sidebar-open');
        if (overlay) {
          overlay.style.display = 'none';
          document.body.style.overflow = ''; // Allow scrolling again
        }
      }
    });
  });
  
  // Navigation arrows click handler
  const navArrows = document.querySelectorAll('.nav-arrow');
  navArrows.forEach(arrow => {
    arrow.addEventListener('click', function() {
      if (this.classList.contains('nav-back')) {
        window.history.back();
      } else if (this.classList.contains('nav-forward')) {
        window.history.forward();
      }
    });
  });

  // Search functionality
  const searchInput = document.querySelector('.search-container input');
  if (searchInput) {
    searchInput.addEventListener('focus', function() {
      this.parentElement.style.boxShadow = '0 0 0 2px var(--primary-color)';
    });
    
    searchInput.addEventListener('blur', function() {
      this.parentElement.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
    });
    
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        const query = this.value.trim();
        if (query) {
          window.location.href = `search.html?q=${encodeURIComponent(query)}`;
        }
      }
    });
  }

  // Check if user follows Brian_luceca
  // This will be used by watch buttons to determine if the follow modal should be shown
  window.showFollowModal = function(callback) {
    // We're removing the follow modal functionality as per requirements
    // Just continue with the callback immediately
    if (callback) callback();
  };

  // Setup global search if the function exists
  if (window.setupGlobalSearch) {
    window.setupGlobalSearch();
  }
});