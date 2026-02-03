// ========== REAL-TIME GUESTBOOK POLLING ==========
// Robust version with all edge cases handled

(function() {
  let knownPhotoIds = new Set();
  let pollInterval = null;
  let isSyncing = false;  // Prevent overlapping syncs
  let isUserAction = false;  // Pause polling during user actions
  const POLL_INTERVAL_MS = 3000;
  
  /**
   * Initialize polling
   */
  function initGuestbookPolling() {
      // Wait for guestbook to be loaded first
      const guestbookGrid = document.getElementById('gallery-guestbook-grid');
      if (!guestbookGrid) {
          console.log('Guestbook grid not found, retrying in 2s...');
          setTimeout(initGuestbookPolling, 2000);
          return;
      }
      
      console.log('🔄 Initializing guestbook polling...');
      
      // Build initial set of known photo IDs
      buildKnownPhotoIds();
      
      // Start polling
      startPolling();
      
      // Pause when tab hidden
      document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
              stopPolling();
          } else {
              // Rebuild known IDs and restart
              setTimeout(() => {
                  buildKnownPhotoIds();
                  startPolling();
              }, 500);
          }
      });
      
      // Hook into existing delete/upload to pause polling during user actions
      hookUserActions();
      
      console.log('✅ Guestbook polling active');
  }
  
  function startPolling() {
      stopPolling(); // Clear any existing
      pollInterval = setInterval(syncGuestbook, POLL_INTERVAL_MS);
  }
  
  function stopPolling() {
      if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = null;
      }
  }
  
  /**
   * Hook into user actions to pause polling
   */
  function hookUserActions() {
      // Pause polling when user is uploading or deleting
      const originalFetch = window.fetch;
      window.fetch = function(url, options) {
          if (typeof url === 'string') {
              if (url.includes('/api/guestbook/upload') || url.includes('/api/guestbook/delete')) {
                  isUserAction = true;
                  // Resume polling after action completes
                  return originalFetch.apply(this, arguments).finally(() => {
                      setTimeout(() => {
                          isUserAction = false;
                          buildKnownPhotoIds(); // Rebuild after user action
                      }, 1000);
                  });
              }
          }
          return originalFetch.apply(this, arguments);
      };
  }
  
  /**
   * Build set of photo IDs currently in DOM
   */
  function buildKnownPhotoIds() {
      knownPhotoIds.clear();
      const guestbookGrid = document.getElementById('gallery-guestbook-grid');
      if (!guestbookGrid) return;
      
      guestbookGrid.querySelectorAll('.guestbook-item[data-id]').forEach(el => {
          const id = el.dataset.id;
          if (id && id !== 'undefined' && id !== 'null') {
              knownPhotoIds.add(String(id));
          }
      });
  }
  
  /**
   * Main sync function
   */
  async function syncGuestbook() {
      // Skip if already syncing or user is doing something
      if (isSyncing || isUserAction) return;
      
      isSyncing = true;
      
      try {
          const response = await fetch('/api/guestbook/photos');
          if (!response.ok) {
              isSyncing = false;
              return;
          }
          
          const data = await response.json();
          if (!data.success || !Array.isArray(data.photos)) {
              isSyncing = false;
              return;
          }
          
          const guestbookGrid = document.getElementById('gallery-guestbook-grid');
          if (!guestbookGrid) {
              isSyncing = false;
              return;
          }
          
          const serverPhotos = data.photos;
          const serverPhotoIds = new Set();
          
          // Build server photo map
          const serverPhotoMap = new Map();
          for (const photo of serverPhotos) {
              if (photo && photo.id) {
                  const id = String(photo.id);
                  serverPhotoIds.add(id);
                  serverPhotoMap.set(id, photo);
              }
          }
          
          const visitorId = window.visitorId || localStorage.getItem('guestbook_visitor_id');
          
          // 1. Add NEW photos (on server but not in our known set)
          for (const photo of serverPhotos) {
              if (!photo || !photo.id) continue;
              
              const photoId = String(photo.id);
              
              // Skip if we already know about it
              if (knownPhotoIds.has(photoId)) continue;
              
              // Double-check DOM to prevent duplicates
              if (guestbookGrid.querySelector(`[data-id="${photoId}"]`)) {
                  knownPhotoIds.add(photoId);
                  continue;
              }
              
              console.log('📸 New photo:', photo.visitor_name);
              addPhotoToGuestbook(photo, guestbookGrid);
              knownPhotoIds.add(photoId);
              
              // Notify if not own photo
              if (photo.visitor_id !== visitorId) {
                  showNotification(photo);
              }
          }
          
          // 2. Remove DELETED photos (in DOM but not on server)
          const domPhotos = guestbookGrid.querySelectorAll('.guestbook-item[data-id]');
          domPhotos.forEach(el => {
              const photoId = el.dataset.id;
              if (photoId && !serverPhotoIds.has(String(photoId))) {
                  console.log('🗑️ Removing deleted photo:', photoId);
                  el.style.transition = 'opacity 0.2s';
                  el.style.opacity = '0';
                  setTimeout(() => {
                      if (el.parentElement) el.remove();
                  }, 200);
                  knownPhotoIds.delete(String(photoId));
              }
          });
          
          // Update count
          const countEl = document.getElementById('guestbook-count');
          if (countEl) {
              countEl.textContent = serverPhotos.length;
          }
          
      } catch (err) {
          console.log('Sync error:', err.message);
      }
      
      isSyncing = false;
  }
  
  /**
   * Add photo to grid
   */
  function addPhotoToGuestbook(photo, guestbookGrid) {
      if (!photo || !photo.id || !guestbookGrid) return;
      
      // Final duplicate check
      const photoId = String(photo.id);
      if (guestbookGrid.querySelector(`[data-id="${photoId}"]`)) {
          return;
      }
      
      // Remove empty state
      const emptyState = guestbookGrid.querySelector('.guestbook-empty');
      if (emptyState) emptyState.remove();
      
      const visitorId = window.visitorId || localStorage.getItem('guestbook_visitor_id');
      const isOwnPhoto = photo.visitor_id === visitorId;
      
      const photoEl = document.createElement('div');
      photoEl.className = `guestbook-item ${isOwnPhoto ? 'own-photo' : ''}`;
      photoEl.dataset.id = photoId;
      photoEl.dataset.visitor = photo.visitor_id || '';
      photoEl.dataset.url = photo.image_url || '';
      photoEl.dataset.name = photo.visitor_name || 'Anonymous';
      
      const dateStr = photo.created_at ? new Date(photo.created_at).toLocaleDateString() : '';
      
      photoEl.innerHTML = `
          <img src="${photo.image_url || ''}" alt="${photo.visitor_name || 'Photo'}" loading="lazy">
          <div class="guestbook-item-name">${photo.visitor_name || 'Anonymous'}</div>
          <div class="guestbook-item-date">${dateStr}</div>
      `;
      
      // Click handler for preview
      photoEl.addEventListener('click', function() {
          openPreview(photo, isOwnPhoto);
      });
      
      // Insert at correct position (after header, before other photos)
      const header = guestbookGrid.querySelector('.guestbook-header');
      const firstPhoto = guestbookGrid.querySelector('.guestbook-item');
      
      if (header && header.nextElementSibling) {
          header.after(photoEl);
      } else if (firstPhoto) {
          guestbookGrid.insertBefore(photoEl, firstPhoto);
      } else {
          guestbookGrid.appendChild(photoEl);
      }
      
      // Simple fade in
      photoEl.style.opacity = '0';
      setTimeout(() => {
          photoEl.style.transition = 'opacity 0.3s';
          photoEl.style.opacity = '1';
      }, 10);
  }
  
  /**
   * Open preview
   */
  function openPreview(photo, isOwnPhoto) {
      try {
          const preview = document.getElementById('gallery-preview');
          const previewContent = document.getElementById('gallery-preview-content');
          const previewTitle = document.getElementById('preview-title');
          
          if (!preview || !previewContent || !previewTitle) return;
          
          const dateStr = photo.created_at ? new Date(photo.created_at).toLocaleDateString() : '';
          previewTitle.textContent = `${photo.visitor_name || 'Anonymous'} - ${dateStr}`;
          previewContent.innerHTML = `<img src="${photo.image_url}" alt="${photo.visitor_name || 'Photo'}">`;
          
          const previewWallpaperBtn = document.getElementById('preview-wallpaper-btn');
          const previewDownloadBtn = document.getElementById('preview-download-btn');
          const previewDeleteBtn = document.getElementById('preview-delete-btn');
          
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
      } catch (err) {
          console.log('Preview error:', err);
      }
  }
  
  /**
   * Show notification
   */
  function showNotification(photo) {
      try {
          // Don't show if guestbook tab is active
          const guestbookTab = document.querySelector('[data-tab="guestbook"]');
          const guestbookGrid = document.getElementById('gallery-guestbook-grid');
          if (guestbookTab && guestbookTab.classList.contains('active') && 
              guestbookGrid && guestbookGrid.style.display !== 'none') {
              return;
          }
          
          // Remove existing notifications first
          document.querySelectorAll('.guestbook-poll-notification').forEach(n => n.remove());
          
          const notification = document.createElement('div');
          notification.className = 'guestbook-poll-notification';
          notification.innerHTML = `📸 <b>${photo.visitor_name || 'Someone'}</b> added a photo!`;
          notification.style.cssText = `
              position: fixed;
              bottom: 60px;
              right: 20px;
              background: #000080;
              color: white;
              padding: 10px 15px;
              font-family: 'MS Sans Serif', Arial, sans-serif;
              font-size: 12px;
              z-index: 9999;
              cursor: pointer;
              border: 2px outset #aaa;
          `;
          
          notification.onclick = function() {
              notification.remove();
              // Open gallery to guestbook
              const galleryWindow = document.getElementById('gallery-window');
              if (galleryWindow) {
                  galleryWindow.classList.add('active');
                  if (typeof bringToFront === 'function') bringToFront(galleryWindow);
                  if (typeof updateTaskbar === 'function') updateTaskbar();
              }
              document.querySelectorAll('.gallery-tab').forEach(t => t.classList.remove('active'));
              if (guestbookTab) guestbookTab.classList.add('active');
              
              const pg = document.getElementById('gallery-photos-grid');
              const vg = document.getElementById('gallery-videos-grid');
              const gg = document.getElementById('gallery-guestbook-grid');
              if (pg) pg.style.display = 'none';
              if (vg) vg.style.display = 'none';
              if (gg) gg.style.display = 'grid';
          };
          
          document.body.appendChild(notification);
          
          // Auto remove
          setTimeout(() => {
              if (notification.parentElement) notification.remove();
          }, 5000);
      } catch (err) {
          // Ignore notification errors
      }
  }
  
  // Start after page loads
  if (document.readyState === 'complete') {
      setTimeout(initGuestbookPolling, 1500);
  } else {
      window.addEventListener('load', () => setTimeout(initGuestbookPolling, 1500));
  }
})();