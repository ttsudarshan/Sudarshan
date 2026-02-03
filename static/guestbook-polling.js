// ========== REAL-TIME GUESTBOOK POLLING ==========
// Add this to your script.js or include as separate file

(function() {
  let lastCheckTime = null;
  let pollInterval = null;
  const POLL_INTERVAL_MS = 3000; // Check every 3 seconds
  
  /**
   * Initialize polling for guestbook updates
   */
  function initGuestbookPolling() {
      console.log('🔄 Initializing guestbook polling...');
      
      // Get the most recent photo timestamp from server on init
      fetchLatestTimestamp();
      
      // Start polling
      pollInterval = setInterval(checkForNewPhotos, POLL_INTERVAL_MS);
      
      // Pause polling when tab is hidden, resume when visible
      document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
              console.log('Tab hidden - pausing guestbook polling');
              clearInterval(pollInterval);
          } else {
              console.log('Tab visible - resuming guestbook polling');
              fetchLatestTimestamp(); // Refresh timestamp
              pollInterval = setInterval(checkForNewPhotos, POLL_INTERVAL_MS);
          }
      });
      
      console.log('✅ Guestbook polling active (every 3s)');
  }
  
  /**
   * Fetch the latest photo timestamp from server
   */
  async function fetchLatestTimestamp() {
      try {
          const response = await fetch('/api/guestbook/photos?limit=1');
          const data = await response.json();
          
          if (data.success && data.photos && data.photos.length > 0) {
              lastCheckTime = data.photos[0].created_at;
              console.log('📌 Last photo timestamp:', lastCheckTime);
          } else {
              // No photos yet, use current time
              lastCheckTime = new Date().toISOString();
              console.log('📌 No photos yet, using current time');
          }
      } catch (err) {
          console.log('Failed to fetch latest timestamp:', err);
          lastCheckTime = new Date().toISOString();
      }
  }
  
  /**
   * Check for new photos since last check
   */
  async function checkForNewPhotos() {
      if (!lastCheckTime) {
          console.log('No lastCheckTime set, skipping poll');
          return;
      }
      
      try {
          const url = `/api/guestbook/photos?since=${encodeURIComponent(lastCheckTime)}`;
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.success && data.photos && data.photos.length > 0) {
              console.log(`📸 Found ${data.photos.length} new photo(s)!`);
              
              const visitorId = window.visitorId || localStorage.getItem('guestbook_visitor_id');
              
              // Process photos in reverse order (oldest first) so newest ends up on top
              const photosToAdd = [...data.photos].reverse();
              
              for (const photo of photosToAdd) {
                  // Skip if already in DOM
                  const guestbookGrid = document.getElementById('gallery-guestbook-grid');
                  if (guestbookGrid && guestbookGrid.querySelector(`[data-id="${photo.id}"]`)) {
                      console.log('Photo already exists, skipping:', photo.id);
                      continue;
                  }
                  
                  // Add to guestbook
                  addPhotoToGuestbook(photo);
                  
                  // Show notification for other people's photos
                  if (photo.visitor_id !== visitorId) {
                      showNewPhotoNotification(photo);
                  }
              }
              
              // Update timestamp to the newest photo
              lastCheckTime = data.photos[0].created_at;
              console.log('📌 Updated lastCheckTime:', lastCheckTime);
          }
      } catch (err) {
          console.log('Poll check failed:', err);
      }
      
      // Also check for deletions
      checkForDeletedPhotos();
  }
  
  /**
   * Check if any photos were deleted and remove them from DOM
   */
  async function checkForDeletedPhotos() {
      try {
          const guestbookGrid = document.getElementById('gallery-guestbook-grid');
          if (!guestbookGrid) return;
          
          // Get all photo IDs currently in DOM
          const domPhotos = guestbookGrid.querySelectorAll('.guestbook-item[data-id]');
          if (domPhotos.length === 0) return;
          
          // Fetch all current photos from server
          const response = await fetch('/api/guestbook/photos');
          const data = await response.json();
          
          if (!data.success) return;
          
          // Create set of server photo IDs
          const serverPhotoIds = new Set(data.photos.map(p => String(p.id)));
          
          // Check each DOM photo
          domPhotos.forEach(photoEl => {
              const photoId = photoEl.dataset.id;
              if (photoId && !serverPhotoIds.has(photoId)) {
                  console.log('🗑️ Photo deleted, removing from view:', photoId);
                  
                  // Animate out
                  photoEl.style.transition = 'opacity 0.3s, transform 0.3s';
                  photoEl.style.opacity = '0';
                  photoEl.style.transform = 'scale(0.8)';
                  
                  setTimeout(() => {
                      photoEl.remove();
                      
                      // Update count
                      const countEl = document.getElementById('guestbook-count');
                      if (countEl) {
                          const current = parseInt(countEl.textContent || 0);
                          countEl.textContent = Math.max(0, current - 1);
                      }
                  }, 300);
              }
          });
      } catch (err) {
          // Silent fail
      }
  }
  
  /**
   * Add a new photo to the guestbook grid
   */
  function addPhotoToGuestbook(photo) {
      const guestbookGrid = document.getElementById('gallery-guestbook-grid');
      if (!guestbookGrid) {
          console.log('Guestbook grid not found');
          return;
      }
      
      const visitorId = window.visitorId || localStorage.getItem('guestbook_visitor_id');
      const isOwnPhoto = photo.visitor_id === visitorId;
      
      console.log('Adding photo to guestbook:', photo.visitor_name);
      
      // Remove empty state if present
      const emptyState = guestbookGrid.querySelector('.guestbook-empty');
      if (emptyState) {
          emptyState.remove();
      }
      
      // Create photo element
      const photoEl = document.createElement('div');
      photoEl.className = `guestbook-item ${isOwnPhoto ? 'own-photo' : ''}`;
      photoEl.dataset.id = photo.id;
      photoEl.dataset.visitor = photo.visitor_id;
      photoEl.dataset.url = photo.image_url;
      photoEl.dataset.name = photo.visitor_name;
      
      photoEl.innerHTML = `
          <img src="${photo.image_url}" alt="${photo.visitor_name}" loading="lazy">
          <div class="guestbook-item-name">${photo.visitor_name}</div>
          <div class="guestbook-item-date">${new Date(photo.created_at).toLocaleDateString()}</div>
      `;
      
      // Add click handler for preview
      photoEl.addEventListener('click', () => {
          openGuestbookPreview(photo, isOwnPhoto);
      });
      
      // Insert after header (at the top of photos)
      const header = guestbookGrid.querySelector('.guestbook-header');
      if (header && header.nextSibling) {
          guestbookGrid.insertBefore(photoEl, header.nextSibling);
      } else if (header) {
          header.after(photoEl);
      } else {
          guestbookGrid.prepend(photoEl);
      }
      
      // Add animation
      photoEl.style.opacity = '0';
      photoEl.style.transform = 'scale(0.8)';
      requestAnimationFrame(() => {
          photoEl.style.transition = 'opacity 0.3s, transform 0.3s';
          photoEl.style.opacity = '1';
          photoEl.style.transform = 'scale(1)';
      });
      
      // Update count
      const countEl = document.getElementById('guestbook-count');
      if (countEl) {
          countEl.textContent = parseInt(countEl.textContent || 0) + 1;
      }
  }
  
  /**
   * Open preview for a guestbook photo
   */
  function openGuestbookPreview(photo, isOwnPhoto) {
      const preview = document.getElementById('gallery-preview');
      const previewContent = document.getElementById('gallery-preview-content');
      const previewTitle = document.getElementById('preview-title');
      const previewWallpaperBtn = document.getElementById('preview-wallpaper-btn');
      const previewDownloadBtn = document.getElementById('preview-download-btn');
      const previewDeleteBtn = document.getElementById('preview-delete-btn');
      
      if (!preview || !previewContent) return;
      
      const date = new Date(photo.created_at).toLocaleDateString();
      previewTitle.textContent = `${photo.visitor_name} - ${date}`;
      previewContent.innerHTML = `<img src="${photo.image_url}" alt="${photo.visitor_name}">`;
      
      if (previewWallpaperBtn) previewWallpaperBtn.style.display = 'inline-block';
      if (previewDownloadBtn) previewDownloadBtn.style.display = 'inline-block';
      
      if (previewDeleteBtn) {
          previewDeleteBtn.style.display = isOwnPhoto ? 'inline-block' : 'none';
          previewDeleteBtn.textContent = '🗑️ Delete';
      }
      
      preview.style.display = 'block';
      
      // Store for actions
      window.currentPreviewItem = {
          data: photo.image_url,
          visitor_name: photo.visitor_name,
          id: photo.id,
          isOwnPhoto: isOwnPhoto
      };
      window.currentPreviewType = 'guestbook';
  }
  
  /**
   * Show notification when someone else adds a photo
   */
  function showNewPhotoNotification(photo) {
      // Don't show if guestbook tab is active
      const guestbookTab = document.querySelector('[data-tab="guestbook"]');
      if (guestbookTab && guestbookTab.classList.contains('active')) {
          return;
      }
      
      // Create notification
      const notification = document.createElement('div');
      notification.className = 'guestbook-notification';
      notification.innerHTML = `
          📸 <strong>${photo.visitor_name}</strong> added a photo!
          <span style="margin-left:10px;cursor:pointer" onclick="this.parentElement.remove()">✕</span>
      `;
      notification.style.cssText = `
          position: fixed;
          bottom: 60px;
          right: 20px;
          background: #000080;
          color: white;
          padding: 12px 16px;
          border: 2px outset #ccc;
          font-family: 'MS Sans Serif', Arial, sans-serif;
          font-size: 12px;
          z-index: 9999;
          cursor: pointer;
          box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      `;
      
      // Click to view guestbook
      notification.addEventListener('click', (e) => {
          if (e.target.tagName !== 'SPAN') {
              // Open gallery window
              const galleryWindow = document.getElementById('gallery-window');
              if (galleryWindow) {
                  galleryWindow.classList.add('active');
                  if (typeof bringToFront === 'function') bringToFront(galleryWindow);
                  if (typeof updateTaskbar === 'function') updateTaskbar();
              }
              
              // Switch to guestbook tab
              document.querySelectorAll('.gallery-tab').forEach(t => t.classList.remove('active'));
              const guestbookTab = document.querySelector('[data-tab="guestbook"]');
              if (guestbookTab) guestbookTab.classList.add('active');
              
              const photosGrid = document.getElementById('gallery-photos-grid');
              const videosGrid = document.getElementById('gallery-videos-grid');
              const guestbookGrid = document.getElementById('gallery-guestbook-grid');
              
              if (photosGrid) photosGrid.style.display = 'none';
              if (videosGrid) videosGrid.style.display = 'none';
              if (guestbookGrid) guestbookGrid.style.display = 'grid';
              
              notification.remove();
          }
      });
      
      document.body.appendChild(notification);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
          if (notification.parentElement) {
              notification.style.transition = 'opacity 0.3s';
              notification.style.opacity = '0';
              setTimeout(() => notification.remove(), 300);
          }
      }, 5000);
  }
  
  // Start when DOM is ready
  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initGuestbookPolling);
  } else {
      // Small delay to let the page load guestbook first
      setTimeout(initGuestbookPolling, 1000);
  }
})();