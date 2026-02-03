// ========== REAL-TIME GUESTBOOK - SIMPLE POLLING VERSION ==========
// This is FASTER and more reliable than SSE for most hosting platforms
// Add this to your script.js file

(function() {
  let lastPhotoTimestamp = null;
  let pollInterval = null;
  const POLL_INTERVAL_MS = 3000; // Check every 3 seconds
  
  /**
   * Initialize polling for guestbook updates
   */
  function initGuestbookPolling() {
      // Get initial timestamp from existing photos
      updateLastTimestamp();
      
      // Start polling
      pollInterval = setInterval(checkForNewPhotos, POLL_INTERVAL_MS);
      
      // Stop polling when page is hidden, resume when visible
      document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
              clearInterval(pollInterval);
          } else {
              pollInterval = setInterval(checkForNewPhotos, POLL_INTERVAL_MS);
          }
      });
      
      console.log('✅ Guestbook polling active (every 3s)');
  }
  
  /**
   * Update the last known photo timestamp
   */
  function updateLastTimestamp() {
      const guestbookGrid = document.getElementById('gallery-guestbook-grid');
      if (!guestbookGrid) return;
      
      const firstPhoto = guestbookGrid.querySelector('.guestbook-item');
      if (firstPhoto && firstPhoto.dataset.timestamp) {
          lastPhotoTimestamp = firstPhoto.dataset.timestamp;
      }
  }
  
  /**
   * Check for new photos since last check
   */
  async function checkForNewPhotos() {
      try {
          const url = lastPhotoTimestamp 
              ? `/api/guestbook/photos?since=${encodeURIComponent(lastPhotoTimestamp)}`
              : '/api/guestbook/photos?limit=1';
          
          const response = await fetch(url);
          const data = await response.json();
          
          if (data.success && data.photos && data.photos.length > 0) {
              // Check if we have genuinely new photos
              const visitorId = window.visitorId || localStorage.getItem('guestbook_visitor_id');
              
              for (const photo of data.photos) {
                  // Skip if this photo already exists in DOM
                  const guestbookGrid = document.getElementById('gallery-guestbook-grid');
                  if (guestbookGrid && guestbookGrid.querySelector(`[data-id="${photo.id}"]`)) {
                      continue;
                  }
                  
                  // Add new photo
                  addPhotoToGuestbook(photo);
                  
                  // Show notification if not own photo
                  if (photo.visitor_id !== visitorId) {
                      showNewPhotoNotification(photo);
                  }
              }
              
              // Update timestamp
              if (data.photos[0]) {
                  lastPhotoTimestamp = data.photos[0].created_at;
              }
          }
      } catch (err) {
          // Silent fail - will retry on next interval
          console.log('Poll check failed, will retry...');
      }
  }
  
  /**
   * Add a new photo to the guestbook grid
   */
  function addPhotoToGuestbook(photo) {
      const guestbookGrid = document.getElementById('gallery-guestbook-grid');
      if (!guestbookGrid) return;
      
      const visitorId = window.visitorId || localStorage.getItem('guestbook_visitor_id');
      const isOwnPhoto = photo.visitor_id === visitorId;
      
      // Check if photo already exists
      if (guestbookGrid.querySelector(`[data-id="${photo.id}"]`)) {
          return;
      }
      
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
      photoEl.dataset.timestamp = photo.created_at;
      
      photoEl.innerHTML = `
          <img src="${photo.image_url}" alt="${photo.visitor_name}" loading="lazy">
          <div class="guestbook-item-name">${photo.visitor_name}</div>
          <div class="guestbook-item-date">${new Date(photo.created_at).toLocaleDateString()}</div>
      `;
      
      // Add click handler
      photoEl.addEventListener('click', () => {
          openGuestbookPreview(photo, isOwnPhoto);
      });
      
      // Insert after header
      const header = guestbookGrid.querySelector('.guestbook-header');
      if (header && header.nextSibling) {
          guestbookGrid.insertBefore(photoEl, header.nextSibling);
      } else {
          guestbookGrid.prepend(photoEl);
      }
      
      // Animate
      photoEl.style.animation = 'photoFadeIn 0.4s ease-out';
      
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
      const previewDeleteBtn = document.getElementById('preview-delete-btn');
      
      if (!preview || !previewContent) return;
      
      previewTitle.textContent = `${photo.visitor_name} - ${new Date(photo.created_at).toLocaleDateString()}`;
      previewContent.innerHTML = `<img src="${photo.image_url}" alt="${photo.visitor_name}">`;
      
      if (previewDeleteBtn) {
          previewDeleteBtn.style.display = isOwnPhoto ? 'inline-block' : 'none';
      }
      
      preview.style.display = 'block';
      
      window.currentPreviewItem = {
          data: photo.image_url,
          visitor_name: photo.visitor_name,
          id: photo.id,
          isOwnPhoto: isOwnPhoto
      };
      window.currentPreviewType = 'guestbook';
  }
  
  /**
   * Show notification toast
   */
  function showNewPhotoNotification(photo) {
      // Don't show if on guestbook tab
      const guestbookTab = document.querySelector('[data-tab="guestbook"]');
      if (guestbookTab && guestbookTab.classList.contains('active')) return;
      
      // Create notification
      const notification = document.createElement('div');
      notification.innerHTML = `
          <span>📸</span>
          <span><strong>${photo.visitor_name}</strong> added a photo!</span>
          <button onclick="this.parentElement.remove()">✕</button>
      `;
      notification.style.cssText = `
          position: fixed;
          bottom: 60px;
          right: 20px;
          background: #000080;
          color: white;
          padding: 10px 14px;
          border: 2px outset #ccc;
          font-family: 'MS Sans Serif', Arial, sans-serif;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 9999;
          cursor: pointer;
      `;
      
      notification.addEventListener('click', (e) => {
          if (e.target.tagName !== 'BUTTON') {
              // Switch to guestbook
              document.querySelectorAll('.gallery-tab').forEach(t => t.classList.remove('active'));
              if (guestbookTab) guestbookTab.classList.add('active');
              document.getElementById('gallery-photos-grid').style.display = 'none';
              document.getElementById('gallery-videos-grid').style.display = 'none';
              document.getElementById('gallery-guestbook-grid').style.display = 'grid';
              
              const galleryWindow = document.getElementById('gallery-window');
              if (galleryWindow) galleryWindow.classList.add('active');
              
              notification.remove();
          }
      });
      
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
  }
  
  // Add animation styles
  if (!document.getElementById('guestbook-poll-styles')) {
      const style = document.createElement('style');
      style.id = 'guestbook-poll-styles';
      style.textContent = `
          @keyframes photoFadeIn {
              from { opacity: 0; transform: scale(0.9); }
              to { opacity: 1; transform: scale(1); }
          }
      `;
      document.head.appendChild(style);
  }
  
  // Start polling when DOM ready
  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initGuestbookPolling);
  } else {
      initGuestbookPolling();
  }
})();