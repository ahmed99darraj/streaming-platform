document.addEventListener('DOMContentLoaded', async function() {
  // Initialize WebsimSocket connection
  const room = new WebsimSocket();
  
  // Counter to track followers loaded
  let followersLoaded = 0;
  const maxFollowersToShow = 6;
  let followersLoading = true;
  
  // Get current user info
  let username;
  try {
    room.party.subscribe((peers) => {
      username = room.party.client.username;
      updateUserProfile();
    });
  } catch (error) {
    console.error('Error getting current client info:', error);
    username = 'User';
  }
  
  // Update user profile picture based on username
  function updateUserProfile() {
    const userProfileButton = document.getElementById('user-profile');
    
    if (username) {
      userProfileButton.innerHTML = `
        <img src="https://images.websim.ai/avatar/${username}" alt="${username}'s profile">
      `;
    } else {
      userProfileButton.innerHTML = `
        <img src="https://i.pravatar.cc/100?img=10" alt="User profile">
      `;
    }
  }
  
  // Create followers with randomized status (online/offline)
  async function loadFollowers() {
    const followingList = document.getElementById('following-list');
    if (!followingList) return;
    
    followingList.innerHTML = ''; // Clear loading message
    
    // Set a timeout to show "no followers" message if no followers load within 5 seconds
    const noFollowersTimeout = setTimeout(() => {
      if (followersLoaded === 0 && followersLoading) {
        followingList.innerHTML = '<li class="no-followers">No followers found</li>';
        followersLoading = false;
      }
    }, 5000);
    
    // Array to store followers for use in other parts of the app
    const followers = [];
    
    // Iterate through all peers to show them as followers
    for (const clientId in room.party.peers) {
      const peer = room.party.peers[clientId];
      
      // Skip current user
      if (clientId === room.party.client.id) continue;
      
      // Random status (online/offline)
      const isOnline = Math.random() > 0.4;
      const statusClass = isOnline ? 'status-online' : 'status-offline';
      
      // Create follower element
      const followerItem = document.createElement('li');
      followerItem.innerHTML = `
        <div class="avatar">
          <img src="https://images.websim.ai/avatar/${peer.username}" alt="${peer.username}'s avatar">
        </div>
        <span>${peer.username}</span>
        <span class="status ${statusClass}"></span>
      `;
      
      // Add to followers list
      followingList.appendChild(followerItem);
      
      // Store follower info for other parts of the app
      followers.push({
        id: clientId,
        username: peer.username,
        isOnline: isOnline
      });
      
      followersLoaded++;
      
      // Only show up to maxFollowersToShow
      if (followersLoaded >= maxFollowersToShow) break;
    }
    
    // If we have fewer than maxFollowersToShow peers, add some fake followers
    if (followersLoaded < maxFollowersToShow) {
      const fakeFollowers = [
        { username: 'Ikako.t', online: false },
        { username: 'Nick.B', online: true },
        { username: 'Vika.J', online: false },
        { username: 'Alessandr.B', online: true },
        { username: 'Anna.S', online: true },
        { username: 'Dadd.H', online: true }
      ];
      
      for (let i = 0; i < (maxFollowersToShow - followersLoaded); i++) {
        if (i >= fakeFollowers.length) break;
        
        const fakeFollower = fakeFollowers[i];
        const statusClass = fakeFollower.online ? 'status-online' : 'status-offline';
        
        const followerItem = document.createElement('li');
        followerItem.innerHTML = `
          <div class="avatar">
            <img src="https://images.websim.ai/avatar/${fakeFollower.username}" alt="${fakeFollower.username}'s avatar">
          </div>
          <span>${fakeFollower.username}</span>
          <span class="status ${statusClass}"></span>
        `;
        
        followingList.appendChild(followerItem);
        
        followers.push({
          id: `fake-${i}`,
          username: fakeFollower.username,
          isOnline: fakeFollower.online
        });
        
        followersLoaded++;
      }
    }
    
    // Clear the timeout since we've loaded followers
    if (followersLoaded > 0) {
      clearTimeout(noFollowersTimeout);
      followersLoading = false;
    }
    
    // Update featured watching section with follower avatars
    updateFeaturedWatching(followers);
    
    // Update party watchers
    updatePartyWatchers(followers);
    
    return followers;
  }
  
  // Update featured watching section with followers who are "watching"
  function updateFeaturedWatching(followers) {
    const featuredWatchingAvatars = document.getElementById('watching-avatars');
    const watchingCountSpan = document.querySelector('.watching-info span');
    
    if (!featuredWatchingAvatars || !watchingCountSpan) return;
    
    // Clear current avatars
    featuredWatchingAvatars.innerHTML = '';
    
    // Randomly choose how many followers are watching (1-3)
    const numWatching = Math.min(Math.floor(Math.random() * 3) + 1, followers.length);
    
    // Shuffle array to get random followers
    const shuffled = [...followers].sort(() => 0.5 - Math.random());
    const watchingFollowers = shuffled.slice(0, numWatching);
    
    // Add avatars to watching section
    watchingFollowers.forEach(follower => {
      const img = document.createElement('img');
      img.src = `https://images.websim.ai/avatar/${follower.username}`;
      img.alt = `${follower.username}'s avatar`;
      featuredWatchingAvatars.appendChild(img);
    });
    
    // Add additional "fake" watchers if needed
    const totalWatching = numWatching + Math.floor(Math.random() * 5);
    watchingCountSpan.textContent = `+${totalWatching} friends are watching`;
  }
  
  // Update party watchers for movie cards
  function updatePartyWatchers(followers) {
    // For each movie card, add random watchers from followers
    const watcherAvatarsContainers = document.querySelectorAll('.watcher-avatars');
    
    watcherAvatarsContainers.forEach((container, index) => {
      // Clear existing watchers
      container.innerHTML = '';
      
      // Shuffle followers array to get random ones
      const shuffled = [...followers].sort(() => 0.5 - Math.random());
      
      // Get 1-3 followers as watchers for this movie
      const numWatchers = Math.min(Math.floor(Math.random() * 3) + 1, followers.length);
      const watchers = shuffled.slice(0, numWatchers);
      
      // Add watcher avatars
      watchers.forEach(watcher => {
        const img = document.createElement('img');
        img.src = `https://images.websim.ai/avatar/${watcher.username}`;
        img.alt = `${watcher.username}'s avatar`;
        container.appendChild(img);
      });
    });
  }
  
  // Set up event handlers for watching movies
  function setupWatchEvents() {
    const watchButton = document.querySelector('.watch-button');
    if (watchButton) {
      watchButton.addEventListener('click', function() {
        // Get current featured movie title from the DOM
        const movieTitle = document.querySelector('.featured-content h1').textContent;
        
        // Broadcast that you're watching this movie
        room.send({
          type: "watching",
          movieId: "featured", // Use a placeholder ID
          movieTitle: movieTitle,
          username: username || "User"
        });
        
        // Simulate starting playback
        console.log(`Watch button clicked - starting playback of ${movieTitle}`);
        
        // Visual feedback for click
        this.textContent = "Watching...";
        setTimeout(() => {
          this.textContent = "Watch";
        }, 2000);
      });
    }
    
    // If the setWatchButtonEvent function exists in movies.js, use that instead
    if (window.setWatchButtonEvent) {
      window.setWatchButtonEvent();
    }
  }
  
  // Handle incoming watch events from other users
  room.onmessage = (event) => {
    const data = event.data;
    if (data.type === "watching") {
      console.log(`${data.username} is watching ${data.movieTitle}`);
      
      // You could update UI to show who's watching what
      const notification = document.createElement('div');
      notification.className = 'watch-notification';
      notification.innerHTML = `
        <div class="notification-avatar">
          <img src="https://images.websim.ai/avatar/${data.username}" alt="${data.username}'s avatar">
        </div>
        <div class="notification-text">${data.username} started watching ${data.movieTitle}</div>
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
  
  // Initialize followers list
  setTimeout(async () => {
    await loadFollowers();
    setupWatchEvents();
  }, 1000);
  
  // Load more followers button
  const loadMoreButton = document.querySelector('.load-more');
  if (loadMoreButton) {
    loadMoreButton.addEventListener('click', function() {
      console.log('Load more followers clicked');
      
      // Visual feedback
      this.querySelector('span').textContent = 'Loading...';
      
      // Reset after a short delay
      setTimeout(() => {
        this.querySelector('span').textContent = 'Load more';
      }, 1500);
    });
  }
  
  // Make room available globally so movies.js can access it
  window.room = room;
});