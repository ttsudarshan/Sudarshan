// ========== REAL-TIME GUESTBOOK SSE (Server-Sent Events) ==========
// Add this code to your script.js file, inside or after the GALLERY FUNCTIONALITY section
// This enables automatic updates when someone adds a new photo to the guestbook

(function() {
  let sseConnection = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds
  
  /**
   * Initialize SSE connection for real-time guestbook updates
   */
  function initGuestbookSSE() {
      // Check if EventSource is supported
      if (typeof EventSource === 'undefined') {
          console.log('SSE not supported by this browser');
          return;
      }
      
      // Don't reconnect if we've exceeded max attempts
      if (reconnectAttempts >= maxReconnectAttempts) {
          console.log('Max SSE reconnection attempts reached');
          return;
      }
      
      try {
          sseConnection = new EventSource('/api/guestbook/stream');
          
          // Connection opened
          sseConnection.addEventListener('open', () => {
              console.log('🔗 Guestbook SSE connected');
              reconnectAttempts = 0; // Reset on successful connection
          });
          
          // Handle connection event from server
          sseConnection.addEventListener('connected', (e) => {
              console.log('✅ Guestbook real-time updates active');
          });
          
          // Handle new photo events
          sseConnection.addEventListener('new_photo', (e) => {
              try {
                  const photo = JSON.parse(e.data);
                  console.log('📸 New guestbook photo received:', photo.visitor_name);
                  
                  // Add the new photo to the guestbook without full reload
                  addPhotoToGuestbook(photo);
                  
                  // Show notification if user is not on guestbook tab
                  showNewPhotoNotification(photo);
              } catch (err) {
                  console.error('Error parsing new photo event:', err);
              }
          });
          
          // Handle photo deletion events
          sseConnection.addEventListener('delete_photo', (e) => {
              try {
                  const data = JSON.parse(e.data);
                  console.log('🗑️ Guestbook photo deleted:', data.id);
                  
                  // Remove the photo from DOM
                  removePhotoFromGuestbook(data.id);
              } catch (err) {
                  console.error('Error parsing delete event:', err);
              }
          });
          
          // Handle errors
          sseConnection.addEventListener('error', (e) => {
              console.log('SSE connection error, will retry...');
              sseConnection.close();
              
              // Attempt reconnection after delay
              reconnectAttempts++;
              setTimeout(initGuestbookSSE, reconnectDelay);
          });
          
      } catch (err) {
          console.error('Failed to create SSE connection:', err);
      }
  }
  
  /**
   * Add a new photo to the guestbook grid without reloading
   */
  function addPhotoToGuestbook(photo) {
      const guestbookGrid = document.getElementById('gallery-guestbook-grid');
      if (!guestbookGrid) return;
      
      const visitorId = window.visitorId || localStorage.getItem('guestbook_visitor_id');
      const isOwnPhoto = photo.visitor_id === visitorId;
      
      // Check if photo already exists (prevent duplicates)
      if (guestbookGrid.querySelector(`[data-id="${photo.id}"]`)) {
          return;
      }
      
      // Create new photo element
      const photoEl = document.createElement('div');
      photoEl.className = `guestbook-item ${isOwnPhoto ? 'own-photo' : ''} new-photo-animation`;
      photoEl.dataset.id = photo.id;
      photoEl.dataset.visitor = photo.visitor_id;
      photoEl.dataset.url = photo.image_url;
      photoEl.dataset.name = photo.visitor_name;
      
      photoEl.innerHTML = `
          <img src="${photo.image_url}" alt="${photo.visitor_name}">
          <div class="guestbook-item-name">${photo.visitor_name}</div>
          <div class="guestbook-item-date">${new Date(photo.created_at).toLocaleDateString()}</div>
      `;
      
      // Add click handler for preview
      photoEl.addEventListener('click', () => {
          openGuestbookPreview(photo, isOwnPhoto);
      });
      
      // Find the header and insert after it
      const header = guestbookGrid.querySelector('.guestbook-header');
      if (header && header.nextSibling) {
          guestbookGrid.insertBefore(photoEl, header.nextSibling);
      } else if (header) {
          guestbookGrid.appendChild(photoEl);
      } else {
          // No header, prepend to grid
          guestbookGrid.prepend(photoEl);
      }
      
      // Remove empty state if present
      const emptyState = guestbookGrid.querySelector('.guestbook-empty');
      if (emptyState) {
          emptyState.remove();
      }
      
      // Update count
      updateGuestbookCount(1);
      
      // Remove animation class after animation completes
      setTimeout(() => {
          photoEl.classList.remove('new-photo-animation');
      }, 1000);
  }
  
  /**
   * Remove a photo from the guestbook grid
   */
  function removePhotoFromGuestbook(photoId) {
      const guestbookGrid = document.getElementById('gallery-guestbook-grid');
      if (!guestbookGrid) return;
      
      const photoEl = guestbookGrid.querySelector(`[data-id="${photoId}"]`);
      if (photoEl) {
          photoEl.classList.add('removing-photo-animation');
          setTimeout(() => {
              photoEl.remove();
              updateGuestbookCount(-1);
          }, 300);
      }
  }
  
  /**
   * Update the guestbook photo count
   */
  function updateGuestbookCount(delta) {
      const countEl = document.getElementById('guestbook-count');
      if (countEl) {
          const currentCount = parseInt(countEl.textContent) || 0;
          countEl.textContent = Math.max(0, currentCount + delta);
      }
  }
  
  /**
   * Open preview modal for a guestbook photo
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
          if (isOwnPhoto) {
              previewDeleteBtn.style.display = 'inline-block';
              previewDeleteBtn.textContent = '🗑️ Delete';
          } else {
              previewDeleteBtn.style.display = 'none';
          }
      }
      
      preview.style.display = 'block';
      
      // Store current preview item for actions
      window.currentPreviewItem = {
          data: photo.image_url,
          visitor_name: photo.visitor_name,
          id: photo.id,
          isOwnPhoto: isOwnPhoto
      };
      window.currentPreviewType = 'guestbook';
  }
  
  /**
   * Show a notification when a new photo is added
   */
  function showNewPhotoNotification(photo) {
      // Check if guestbook tab is active
      const guestbookTab = document.querySelector('[data-tab="guestbook"]');
      const isGuestbookActive = guestbookTab && guestbookTab.classList.contains('active');
      
      // Don't show notification if user is already viewing guestbook
      if (isGuestbookActive) return;
      
      // Don't notify for own photos
      const visitorId = window.visitorId || localStorage.getItem('guestbook_visitor_id');
      if (photo.visitor_id === visitorId) return;
      
      // Create notification element
      const notification = document.createElement('div');
      notification.className = 'guestbook-notification';
      notification.innerHTML = `
          <span>📸</span>
          <span><strong>${photo.visitor_name}</strong> just added a photo!</span>
          <button onclick="this.parentElement.remove()">✕</button>
      `;
      
      // Style the notification
      notification.style.cssText = `
          position: fixed;
          bottom: 60px;
          right: 20px;
          background: #000080;
          color: white;
          padding: 12px 16px;
          border: 2px solid;
          border-color: #dfdfdf #808080 #808080 #dfdfdf;
          font-family: 'MS Sans Serif', Arial, sans-serif;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          z-index: 9999;
          animation: slideIn 0.3s ease-out;
          cursor: pointer;
      `;
      
      // Add animation style if not present
      if (!document.getElementById('guestbook-notification-styles')) {
          const style = document.createElement('style');
          style.id = 'guestbook-notification-styles';
          style.textContent = `
              @keyframes slideIn {
                  from { transform: translateX(100%); opacity: 0; }
                  to { transform: translateX(0); opacity: 1; }
              }
              @keyframes slideOut {
                  from { transform: translateX(0); opacity: 1; }
                  to { transform: translateX(100%); opacity: 0; }
              }
              .new-photo-animation {
                  animation: photoFadeIn 0.5s ease-out;
              }
              @keyframes photoFadeIn {
                  from { opacity: 0; transform: scale(0.8); }
                  to { opacity: 1; transform: scale(1); }
              }
              .removing-photo-animation {
                  animation: photoFadeOut 0.3s ease-in forwards;
              }
              @keyframes photoFadeOut {
                  from { opacity: 1; transform: scale(1); }
                  to { opacity: 0; transform: scale(0.8); }
              }
              .guestbook-notification button {
                  background: transparent;
                  border: none;
                  color: white;
                  cursor: pointer;
                  font-size: 14px;
                  padding: 0 4px;
              }
              .guestbook-notification button:hover {
                  color: #ffcc00;
              }
          `;
          document.head.appendChild(style);
      }
      
      // Click to go to guestbook
      notification.addEventListener('click', (e) => {
          if (e.target.tagName !== 'BUTTON') {
              // Switch to guestbook tab
              const tabs = document.querySelectorAll('.gallery-tab');
              tabs.forEach(t => t.classList.remove('active'));
              if (guestbookTab) guestbookTab.classList.add('active');
              
              document.getElementById('gallery-photos-grid').style.display = 'none';
              document.getElementById('gallery-videos-grid').style.display = 'none';
              document.getElementById('gallery-guestbook-grid').style.display = 'grid';
              
              // Open gallery window
              const galleryWindow = document.getElementById('gallery-window');
              if (galleryWindow) {
                  galleryWindow.classList.add('active');
                  if (typeof bringToFront === 'function') bringToFront(galleryWindow);
                  if (typeof updateTaskbar === 'function') updateTaskbar();
              }
              
              notification.remove();
          }
      });
      
      document.body.appendChild(notification);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
          if (notification.parentElement) {
              notification.style.animation = 'slideOut 0.3s ease-in forwards';
              setTimeout(() => notification.remove(), 300);
          }
      }, 5000);
  }
  
  /**
   * Clean up SSE connection when page unloads
   */
  window.addEventListener('beforeunload', () => {
      if (sseConnection) {
          sseConnection.close();
      }
  });
  
  // Initialize SSE when DOM is ready
  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initGuestbookSSE);
  } else {
      initGuestbookSSE();
  }
  
  // Export for external access if needed
  window.guestbookSSE = {
      reconnect: initGuestbookSSE,
      disconnect: () => {
          if (sseConnection) {
              sseConnection.close();
              sseConnection = null;
          }
      }
  };
})();