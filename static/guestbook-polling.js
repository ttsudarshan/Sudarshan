// ========== REAL-TIME GUESTBOOK POLLING ==========
// Fast sync for both new photos and deletions

(function() {
  let knownPhotoIds = new Set();
  let pollInterval = null;
  const POLL_INTERVAL_MS = 2000; // Check every 2 seconds
  
  /**
   * Initialize polling
   */
  function initGuestbookPolling() {
      console.log('🔄 Initializing guestbook polling...');
      
      // Build initial set of known photo IDs from DOM
      buildKnownPhotoIds();
      
      // Start polling
      pollInterval = setInterval(syncGuestbook, POLL_INTERVAL_MS);
      
      // Pause when tab hidden
      document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
              clearInterval(pollInterval);
          } else {
              buildKnownPhotoIds();
              pollInterval = setInterval(syncGuestbook, POLL_INTERVAL_MS);
          }
      });
      
      console.log('✅ Guestbook polling active (every 2s)');
  }
  
  /**
   * Build set of photo IDs currently in DOM
   */
  function buildKnownPhotoIds() {
      knownPhotoIds.clear();
      const guestbookGrid = document.getElementById('gallery-guestbook-grid');
      if (!guestbookGrid) return;
      
      guestbookGrid.querySelectorAll('.guestbook-item[data-id]').forEach(el => {
          knownPhotoIds.add(String(el.dataset.id));
      });
      console.log('📌 Known photos:', knownPhotoIds.size);
  }
  
  /**
   * Main sync function - checks for new AND deleted photos
   */
  async function syncGuestbook() {
      try {
          const response = await fetch('/api/guestbook/photos');
          const data = await response.json();
          
          if (!data.success) return;
          
          const serverPhotos = data.photos || [];
          const serverPhotoIds = new Set(serverPhotos.map(p => String(p.id)));
          const visitorId = window.visitorId || localStorage.getItem('guestbook_visitor_id');
          
          // 1. Check for NEW photos (on server but not in DOM)
          for (const photo of serverPhotos) {
              const photoId = String(photo.id);
              if (!knownPhotoIds.has(photoId)) {
                  console.log('📸 New photo found:', photo.visitor_name);
                  addPhotoToGuestbook(photo);
                  knownPhotoIds.add(photoId);
                  
                  // Notify if not own photo
                  if (photo.visitor_id !== visitorId) {
                      showNewPhotoNotification(photo);
                  }
              }
          }
          
          // 2. Check for DELETED photos (in DOM but not on server)
          const guestbookGrid = document.getElementById('gallery-guestbook-grid');
          if (guestbookGrid) {
              guestbookGrid.querySelectorAll('.guestbook-item[data-id]').forEach(el => {
                  const photoId = String(el.dataset.id);
                  if (!serverPhotoIds.has(photoId)) {
                      console.log('🗑️ Photo deleted:', photoId);
                      removePhotoFromGuestbook(el);
                      knownPhotoIds.delete(photoId);
                  }
              });
          }
          
          // Update count
          const countEl = document.getElementById('guestbook-count');
          if (countEl) {
              countEl.textContent = serverPhotos.length;
          }
          
      } catch (err) {
          // Silent fail, retry next interval
      }
  }
  
  /**
   * Add photo to guestbook grid
   */
  function addPhotoToGuestbook(photo) {
      const guestbookGrid = document.getElementById('gallery-guestbook-grid');
      if (!guestbookGrid) return;
      
      // Remove empty state
      const emptyState = guestbookGrid.querySelector('.guestbook-empty');
      if (emptyState) emptyState.remove();
      
      const visitorId = window.visitorId || localStorage.getItem('guestbook_visitor_id');
      const isOwnPhoto = photo.visitor_id === visitorId;
      
      // Create element
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
      
      // Click handler
      photoEl.addEventListener('click', () => {
          openGuestbookPreview(photo, isOwnPhoto);
      });
      
      // Insert after header
      const header = guestbookGrid.querySelector('.guestbook-header');
      if (header && header.nextSibling) {
          guestbookGrid.insertBefore(photoEl, header.nextSibling);
      } else if (header) {
          header.after(photoEl);
      } else {
          guestbookGrid.prepend(photoEl);
      }
      
      // Animate in
      photoEl.style.opacity = '0';
      photoEl.style.transform = 'scale(0.8)';
      requestAnimationFrame(() => {
          photoEl.style.transition = 'opacity 0.3s, transform 0.3s';
          photoEl.style.opacity = '1';
          photoEl.style.transform = 'scale(1)';
      });
  }
  
  /**
   * Remove photo from guestbook with animation
   */
  function removePhotoFromGuestbook(photoEl) {
      photoEl.style.transition = 'opacity 0.3s, transform 0.3s';
      photoEl.style.opacity = '0';
      photoEl.style.transform = 'scale(0.8)';
      setTimeout(() => photoEl.remove(), 300);
  }
  
  /**
   * Open preview modal
   */
  function openGuestbookPreview(photo, isOwnPhoto) {
      const preview = document.getElementById('gallery-preview');
      const previewContent = document.getElementById('gallery-preview-content');
      const previewTitle = document.getElementById('preview-title');
      const previewDeleteBtn = document.getElementById('preview-delete-btn');
      
      if (!preview || !previewContent) return;
      
      previewTitle.textContent = `${photo.visitor_name} - ${new Date(photo.created_at).toLocaleDateString()}`;
      previewContent.innerHTML = `<img src="${photo.image_url}" alt="${photo.visitor_name}">`;
      
      const previewWallpaperBtn = document.getElementById('preview-wallpaper-btn');
      const previewDownloadBtn = document.getElementById('preview-download-btn');
      if (previewWallpaperBtn) previewWallpaperBtn.style.display = 'inline-block';
      if (previewDownloadBtn) previewDownloadBtn.style.display = 'inline-block';
      
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
   * Show notification
   */
  function showNewPhotoNotification(photo) {
      const guestbookTab = document.querySelector('[data-tab="guestbook"]');
      if (guestbookTab && guestbookTab.classList.contains('active')) return;
      
      const notification = document.createElement('div');
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
      
      notification.addEventListener('click', (e) => {
          if (e.target.tagName !== 'SPAN') {
              const galleryWindow = document.getElementById('gallery-window');
              if (galleryWindow) {
                  galleryWindow.classList.add('active');
                  if (typeof bringToFront === 'function') bringToFront(galleryWindow);
                  if (typeof updateTaskbar === 'function') updateTaskbar();
              }
              
              document.querySelectorAll('.gallery-tab').forEach(t => t.classList.remove('active'));
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
      setTimeout(() => {
          if (notification.parentElement) {
              notification.style.opacity = '0';
              notification.style.transition = 'opacity 0.3s';
              setTimeout(() => notification.remove(), 300);
          }
      }, 5000);
  }
  
  // Start polling
  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(initGuestbookPolling, 1000));
  } else {
      setTimeout(initGuestbookPolling, 1000);
  }
})();