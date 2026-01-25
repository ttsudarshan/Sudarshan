// Window dragging functionality
let activeWindow = null;
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

// Window resize functionality
let isResizing = false;
let currentResize = null;

// Window state tracking
const windowStates = new Map();

class WindowState {
    constructor(windowId) {
        this.id = windowId;
        this.isMinimized = false;
        this.isMaximized = false;
        this.normalPosition = { top: 0, left: 0, width: 0, height: 0 };
    }
}

// Initialize time display
function updateTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    document.getElementById('time').textContent = `${hours}:${minutes}`;
}
updateTime();
setInterval(updateTime, 1000);

// Start menu toggle
const startBtn = document.getElementById('start-btn');
const startMenu = document.getElementById('start-menu');

startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startMenu.classList.toggle('active');
});

document.addEventListener('click', (e) => {
    if (!startMenu.contains(e.target) && e.target !== startBtn) {
        startMenu.classList.remove('active');
    }
});

// Desktop icon functionality
const desktopIcons = document.querySelectorAll('.desktop-icon');
desktopIcons.forEach(icon => {
    let clickTimer = null;
    
    icon.addEventListener('click', () => {
        desktopIcons.forEach(i => i.classList.remove('selected'));
        icon.classList.add('selected');
        
        // Clear previous timer
        if (clickTimer) {
            clearTimeout(clickTimer);
        }
        
        // Open window on single click after short delay
        clickTimer = setTimeout(() => {
            const windowId = icon.dataset.window + '-window';
            openWindow(windowId);
            startMenu.classList.remove('active');
        }, 200);
    });
});

// Start menu items functionality
const startMenuItems = document.querySelectorAll('.start-menu-item[data-window]');
startMenuItems.forEach(item => {
    item.addEventListener('click', () => {
        const windowId = item.dataset.window + '-window';
        openWindow(windowId);
        startMenu.classList.remove('active');
    });
});

// Shutdown button - BSOD
const shutdownBtn = document.getElementById('shutdown-btn');
const bsodScreen = document.getElementById('bsod-screen');

if (shutdownBtn) {
    shutdownBtn.addEventListener('click', () => {
        startMenu.classList.remove('active');
        bsodScreen.classList.add('active');
    });
}

// Click anywhere on BSOD to reload
if (bsodScreen) {
    bsodScreen.addEventListener('click', () => {
        location.reload();
    });
    
    // Also listen for any key press
    document.addEventListener('keydown', (e) => {
        if (bsodScreen.classList.contains('active')) {
            location.reload();
        }
    });
}

// Window controls
function openWindow(windowId) {
    const win = document.getElementById(windowId);
    if (win) {
        win.classList.add('active');
        win.classList.remove('maximized');
        win.classList.remove('minimized');
        bringToFront(win);
        updateTaskbar();
        
        // Focus terminal input if opening terminal
        if (windowId === 'terminal-window') {
            setTimeout(() => {
                const input = document.getElementById('terminal-input');
                if (input) input.focus();
            }, 100);
        }
    }
}

function bringToFront(win) {
    const windows = document.querySelectorAll('.window');
    windows.forEach(w => {
        if (w !== win) {
            w.style.zIndex = 1;
        }
    });
    win.style.zIndex = 10;
}

// Window button controls
document.querySelectorAll('.window').forEach(win => {
    const titleBar = win.querySelector('.title-bar');
    const closeBtn = win.querySelector('.close-btn');
    const minimizeBtn = win.querySelector('.minimize-btn');
    const maximizeBtn = win.querySelector('.maximize-btn');

    // Close button
    closeBtn.addEventListener('click', () => {
        win.classList.remove('active');
        // Stop camera if closing camera window
        if (win.id === 'camera-window') {
            stopCamera();
        }
        updateTaskbar();
    });

    // Minimize button
    minimizeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        minimizeWindow(win);
    });

    // Maximize button
    maximizeBtn.addEventListener('click', () => {
        win.classList.toggle('maximized');
    });

    // Bring window to front on click
    win.addEventListener('mousedown', () => {
        bringToFront(win);
    });

    // Dragging functionality - Enhanced for smooth movement
    titleBar.addEventListener('mousedown', dragStart);
    titleBar.style.cursor = 'move';
    
    function dragStart(e) {
        // Don't drag if clicking buttons or if maximized
        if (e.target.classList.contains('title-bar-button')) return;
        if (win.classList.contains('maximized')) return;

        activeWindow = win;
        isDragging = true;
        
        bringToFront(activeWindow);
        
        // Calculate offset from mouse position to window position
        const rect = activeWindow.getBoundingClientRect();
        initialX = e.clientX - rect.left;
        initialY = e.clientY - rect.top;

        // Add visual feedback
        activeWindow.style.opacity = '0.9';
        
        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);
        
        e.preventDefault();
        e.stopPropagation();
    }

    function drag(e) {
        if (!isDragging || !activeWindow) return;

        e.preventDefault();
        
        // Calculate new position
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        // Boundary checking - keep window within viewport
        const maxX = window.innerWidth - activeWindow.offsetWidth;
        const maxY = window.innerHeight - 40 - activeWindow.offsetHeight;

        // Allow some negative values so window can be partially off-screen
        currentX = Math.max(-50, Math.min(currentX, maxX + 50));
        currentY = Math.max(0, Math.min(currentY, maxY));

        // Apply new position
        activeWindow.style.left = currentX + 'px';
        activeWindow.style.top = currentY + 'px';
    }

    function dragEnd() {
        if (activeWindow) {
            activeWindow.style.opacity = '1';
        }
        isDragging = false;
        activeWindow = null;
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', dragEnd);
    }

    // Setup resizing for this window
    const resizeHandles = win.querySelectorAll('.resize-handle');
    
    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', resizeStart);

        function resizeStart(e) {
            if (win.classList.contains('maximized')) return;

            isResizing = true;
            
            currentResize = {
                window: win,
                direction: handle.className.split(' ')[1].replace('resize-', ''),
                startX: e.clientX,
                startY: e.clientY,
                startWidth: win.offsetWidth,
                startHeight: win.offsetHeight,
                startLeft: win.offsetLeft,
                startTop: win.offsetTop
            };

            document.addEventListener('mousemove', resizeMove);
            document.addEventListener('mouseup', resizeEnd);
            
            e.preventDefault();
            e.stopPropagation();
        }

        function resizeMove(e) {
            if (!isResizing || !currentResize) return;

            const deltaX = e.clientX - currentResize.startX;
            const deltaY = e.clientY - currentResize.startY;
            const resizeWin = currentResize.window;

            let newWidth = currentResize.startWidth;
            let newHeight = currentResize.startHeight;
            let newLeft = currentResize.startLeft;
            let newTop = currentResize.startTop;

            const dir = currentResize.direction;

            if (dir.includes('e')) {
                newWidth = Math.max(300, currentResize.startWidth + deltaX);
            }
            if (dir.includes('w')) {
                newWidth = Math.max(300, currentResize.startWidth - deltaX);
                if (newWidth > 300) newLeft = currentResize.startLeft + deltaX;
            }
            if (dir.includes('s')) {
                newHeight = Math.max(200, currentResize.startHeight + deltaY);
            }
            if (dir.includes('n')) {
                newHeight = Math.max(200, currentResize.startHeight - deltaY);
                if (newHeight > 200) newTop = currentResize.startTop + deltaY;
            }

            resizeWin.style.width = newWidth + 'px';
            resizeWin.style.height = newHeight + 'px';
            resizeWin.style.left = newLeft + 'px';
            resizeWin.style.top = newTop + 'px';
        }

        function resizeEnd() {
            isResizing = false;
            currentResize = null;
            document.removeEventListener('mousemove', resizeMove);
            document.removeEventListener('mouseup', resizeEnd);
        }
    });
});

// Minimize window function
function minimizeWindow(win) {
    const windowId = win.id;
    const state = windowStates.get(windowId) || new WindowState(windowId);
    windowStates.set(windowId, state);
    
    state.isMinimized = true;
    
    win.classList.add('minimized');
    win.classList.remove('active');
    updateTaskbar();
}

// Update taskbar with open windows
function updateTaskbar() {
    const taskbarWindows = document.getElementById('taskbar-windows');
    taskbarWindows.innerHTML = '';

    document.querySelectorAll('.window').forEach(win => {
        if (win.classList.contains('active') || win.classList.contains('minimized')) {
            const titleText = win.querySelector('.title-bar-text span:last-child').textContent;
            const icon = win.querySelector('.title-bar-text span:first-child').textContent;
            
            const taskbarBtn = document.createElement('button');
            taskbarBtn.className = 'taskbar-button';
            
            if (win.classList.contains('active') && !win.classList.contains('minimized')) {
                taskbarBtn.classList.add('active');
            }
            
            taskbarBtn.innerHTML = `<span>${icon}</span><span>${titleText}</span>`;
            
            taskbarBtn.addEventListener('click', () => {
                if (win.classList.contains('minimized')) {
                    win.classList.remove('minimized');
                    win.classList.add('active');
                    bringToFront(win);
                    updateTaskbar();
                } else if (win.classList.contains('active')) {
                    minimizeWindow(win);
                } else {
                    bringToFront(win);
                    win.classList.add('active');
                    updateTaskbar();
                }
            });
            
            taskbarWindows.appendChild(taskbarBtn);
        }
    });
}

// Clear desktop selection when clicking on desktop
document.getElementById('desktop').addEventListener('click', () => {
    desktopIcons.forEach(i => i.classList.remove('selected'));
});

// Prevent default drag behavior
document.addEventListener('dragstart', (e) => e.preventDefault());

// ========== TERMINAL FUNCTIONALITY ==========
(function() {
    const terminalOutput = document.getElementById('terminal-output');
    const terminalInput = document.getElementById('terminal-input');
    const terminalPrompt = document.getElementById('terminal-prompt');
    
    let sessionId = null;
    let commandHistory = [];
    let historyIndex = -1;
    
    // Initialize terminal session
    async function initTerminal() {
        try {
            const response = await fetch('/api/session');
            const data = await response.json();
            sessionId = data.session_id;
            terminalPrompt.textContent = data.prompt;
        } catch (error) {
            console.error('Failed to init terminal:', error);
            sessionId = 'local-' + Date.now();
        }
    }
    
    // Execute command
    async function executeCommand(command) {
        if (!command.trim()) return;
        
        // Add to history
        commandHistory.unshift(command);
        if (commandHistory.length > 50) commandHistory.pop();
        historyIndex = -1;
        
        // Show command in output
        appendOutput(`${terminalPrompt.textContent}${command}`, 'command');
        
        try {
            const response = await fetch('/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command, session_id: sessionId })
            });
            
            const result = await response.json();
            
            // Handle different response types
            if (result.type === 'clear') {
                terminalOutput.innerHTML = '';
            } else if (result.type === 'exit') {
                appendOutput(result.output, 'success');
                document.getElementById('terminal-window').classList.remove('active');
                updateTaskbar();
            } else if (result.type === 'open_window') {
                appendOutput(result.output, 'success');
                // Open the window
                const windowId = result.window + '-window';
                openWindow(windowId);
            } else if (result.output) {
                appendOutput(result.output, result.type || 'info');
            }
            
            // Update prompt
            if (result.prompt) {
                terminalPrompt.textContent = result.prompt;
            }
        } catch (error) {
            appendOutput(`Error: ${error.message}`, 'error');
        }
    }
    
    // Append output to terminal
    function appendOutput(text, type = 'info') {
        const line = document.createElement('div');
        line.className = `terminal-line ${type}`;
        line.textContent = text;
        terminalOutput.appendChild(line);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
    
    // Handle input
    if (terminalInput) {
        terminalInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                const command = terminalInput.value;
                terminalInput.value = '';
                await executeCommand(command);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (historyIndex < commandHistory.length - 1) {
                    historyIndex++;
                    terminalInput.value = commandHistory[historyIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (historyIndex > 0) {
                    historyIndex--;
                    terminalInput.value = commandHistory[historyIndex];
                } else if (historyIndex === 0) {
                    historyIndex = -1;
                    terminalInput.value = '';
                }
            } else if (e.key === 'Tab') {
                e.preventDefault();
                // Tab completion
                const partial = terminalInput.value.split(' ').pop();
                if (partial) {
                    try {
                        const response = await fetch('/api/autocomplete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ partial, session_id: sessionId })
                        });
                        const data = await response.json();
                        if (data.completions && data.completions.length === 1) {
                            const parts = terminalInput.value.split(' ');
                            parts[parts.length - 1] = data.completions[0];
                            terminalInput.value = parts.join(' ');
                        } else if (data.completions && data.completions.length > 1) {
                            appendOutput(data.completions.join('  '), 'info');
                        }
                    } catch (error) {
                        console.error('Autocomplete error:', error);
                    }
                }
            } else if (e.key === 'l' && e.ctrlKey) {
                e.preventDefault();
                terminalOutput.innerHTML = '';
            }
        });
    }
    
    // Initialize
    initTerminal();
})();

// ========== CAMERA & VIDEO FUNCTIONALITY ==========
(function() {
    // Camera elements
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const overlay = document.getElementById('camera-overlay');
    const recordingIndicator = document.getElementById('recording-indicator');
    const timerDisplay = document.getElementById('camera-timer');
    
    // Buttons
    const startCameraBtn = document.getElementById('start-camera-btn');
    const stopCameraBtn = document.getElementById('stop-camera-btn');
    const switchCameraBtn = document.getElementById('switch-camera-btn');
    const mirrorCameraBtn = document.getElementById('mirror-camera-btn');
    const capturePhotoBtn = document.getElementById('capture-photo-btn');
    const recordVideoBtn = document.getElementById('record-video-btn');
    const stopRecordBtn = document.getElementById('stop-record-btn');
    const saveCaptureBtn = document.getElementById('save-capture-btn');
    const wallpaperCaptureBtn = document.getElementById('wallpaper-capture-btn');
    const downloadCaptureBtn = document.getElementById('download-capture-btn');
    
    // Preview
    const lastCapturePreview = document.getElementById('last-capture-preview');
    
    // State
    let stream = null;
    let mediaRecorder = null;
    let recordedChunks = [];
    let isRecording = false;
    let recordingTimer = null;
    let recordingSeconds = 0;
    let facingMode = 'user';
    let isMirrored = true; // Default to mirrored for front camera
    let lastCapture = null;
    let lastCaptureType = null;
    
    // Gallery storage
    window.galleryPhotos = JSON.parse(localStorage.getItem('galleryPhotos') || '[]');
    window.galleryVideos = JSON.parse(localStorage.getItem('galleryVideos') || '[]');
    
    // Start camera
    startCameraBtn.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            });
            video.srcObject = stream;
            overlay.classList.add('hidden');
            
            // Apply mirror mode (default on for front camera)
            if (isMirrored) {
                video.classList.add('mirrored');
                mirrorCameraBtn.classList.add('active');
            }
            
            // Enable buttons
            startCameraBtn.disabled = true;
            stopCameraBtn.disabled = false;
            switchCameraBtn.disabled = false;
            capturePhotoBtn.disabled = false;
            recordVideoBtn.disabled = false;
            document.getElementById('timer-capture-btn').disabled = false;
        } catch (err) {
            console.error('Error accessing camera:', err);
            overlay.innerHTML = `<span>❌ Camera access denied<br><small>${err.message}</small></span>`;
        }
    });
    
    // Mirror mode toggle
    mirrorCameraBtn.addEventListener('click', () => {
        isMirrored = !isMirrored;
        if (isMirrored) {
            video.classList.add('mirrored');
            mirrorCameraBtn.classList.add('active');
        } else {
            video.classList.remove('mirrored');
            mirrorCameraBtn.classList.remove('active');
        }
    });
    
    // Stop camera
    stopCameraBtn.addEventListener('click', () => {
        stopCamera();
    });
    
    window.stopCamera = function() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        video.srcObject = null;
        overlay.classList.remove('hidden');
        overlay.innerHTML = '<span>📷 Click "Start Camera" to begin</span>';
        
        // Reset buttons
        startCameraBtn.disabled = false;
        stopCameraBtn.disabled = true;
        switchCameraBtn.disabled = true;
        capturePhotoBtn.disabled = true;
        recordVideoBtn.disabled = true;
        stopRecordBtn.disabled = true;
        stopRecordBtn.style.display = 'none';
        recordVideoBtn.style.display = 'flex';
        document.getElementById('timer-capture-btn').disabled = true;
        
        // Stop recording if active
        if (isRecording) {
            stopRecording();
        }
    };
    
    // Switch camera
    switchCameraBtn.addEventListener('click', async () => {
        facingMode = facingMode === 'user' ? 'environment' : 'user';
        
        // Auto-enable mirror for front camera, disable for back camera
        if (facingMode === 'user') {
            isMirrored = true;
            video.classList.add('mirrored');
            mirrorCameraBtn.classList.add('active');
        } else {
            isMirrored = false;
            video.classList.remove('mirrored');
            mirrorCameraBtn.classList.remove('active');
        }
        
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            });
            video.srcObject = stream;
        } catch (err) {
            console.error('Error switching camera:', err);
        }
    });
    
    // Capture photo
    capturePhotoBtn.addEventListener('click', () => {
        capturePhoto();
    });
    
    // 3-second timer capture
    const timerCaptureBtn = document.getElementById('timer-capture-btn');
    const countdownOverlay = document.getElementById('countdown-overlay');
    
    timerCaptureBtn.addEventListener('click', () => {
        if (!stream) return;
        
        let countdown = 3;
        timerCaptureBtn.disabled = true;
        capturePhotoBtn.disabled = true;
        
        countdownOverlay.classList.add('active');
        countdownOverlay.textContent = countdown;
        
        const countdownInterval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                countdownOverlay.textContent = countdown;
            } else {
                clearInterval(countdownInterval);
                countdownOverlay.classList.remove('active');
                capturePhoto();
                timerCaptureBtn.disabled = false;
                capturePhotoBtn.disabled = false;
            }
        }, 1000);
    });
    
    function capturePhoto() {
        if (!stream) return;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        
        // If mirrored, flip the canvas to match what user sees
        if (isMirrored) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        
        ctx.drawImage(video, 0, 0);
        
        // Reset transform
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        const dataUrl = canvas.toDataURL('image/png');
        lastCapture = dataUrl;
        lastCaptureType = 'photo';
        
        // Show preview
        lastCapturePreview.innerHTML = `<img src="${dataUrl}" alt="Captured photo">`;
        
        // Enable action buttons
        saveCaptureBtn.disabled = false;
        wallpaperCaptureBtn.disabled = false;
        downloadCaptureBtn.disabled = false;
        
        // Enable guestbook button
        const saveGuestbookBtn = document.getElementById('save-guestbook-btn');
        if (saveGuestbookBtn) saveGuestbookBtn.disabled = false;
        
        // Visual feedback
        overlay.classList.remove('hidden');
        overlay.innerHTML = '<span>📸 Photo captured!</span>';
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 500);
    }
    
    // Record video
    recordVideoBtn.addEventListener('click', () => {
        if (!stream) return;
        startRecording();
    });
    
    stopRecordBtn.addEventListener('click', () => {
        stopRecording();
    });
    
    function startRecording() {
        recordedChunks = [];
        
        const options = { mimeType: 'video/webm;codecs=vp9' };
        try {
            mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
            // Fallback
            try {
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
            } catch (e2) {
                mediaRecorder = new MediaRecorder(stream);
            }
        }
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            lastCaptureType = 'video';
            
            // Store the blob for saving
            lastCapture = { url: url, blob: blob };
            
            // Show preview
            lastCapturePreview.innerHTML = `<video src="${url}" controls style="max-width: 100%; max-height: 100%;"></video>`;
            
            // Enable action buttons
            saveCaptureBtn.disabled = false;
            wallpaperCaptureBtn.disabled = true; // Can't set video as wallpaper
            downloadCaptureBtn.disabled = false;
        };
        
        mediaRecorder.start();
        isRecording = true;
        
        // UI updates
        recordVideoBtn.style.display = 'none';
        stopRecordBtn.style.display = 'flex';
        stopRecordBtn.disabled = false;
        recordingIndicator.classList.add('active');
        timerDisplay.classList.add('active');
        
        // Start timer
        recordingSeconds = 0;
        updateRecordingTimer();
        recordingTimer = setInterval(updateRecordingTimer, 1000);
    }
    
    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        isRecording = false;
        
        // UI updates
        recordVideoBtn.style.display = 'flex';
        stopRecordBtn.style.display = 'none';
        recordingIndicator.classList.remove('active');
        timerDisplay.classList.remove('active');
        
        // Stop timer
        clearInterval(recordingTimer);
    }
    
    function updateRecordingTimer() {
        recordingSeconds++;
        const mins = Math.floor(recordingSeconds / 60).toString().padStart(2, '0');
        const secs = (recordingSeconds % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `${mins}:${secs}`;
    }
    
    // Save capture to gallery - with immediate gallery update
    saveCaptureBtn.addEventListener('click', () => {
        if (!lastCapture) return;
        
        const timestamp = new Date().toISOString();
        
        if (lastCaptureType === 'photo') {
            const photoData = {
                id: Date.now(),
                data: lastCapture,
                timestamp: timestamp,
                type: 'photo'
            };
            window.galleryPhotos.unshift(photoData);
            localStorage.setItem('galleryPhotos', JSON.stringify(window.galleryPhotos));
            
            // Immediately update gallery and show the new photo
            refreshGallery();
            openGalleryWithNewItem('photos');
            
        } else if (lastCaptureType === 'video') {
            // Convert blob to base64 for storage
            const reader = new FileReader();
            reader.onloadend = () => {
                const videoData = {
                    id: Date.now(),
                    data: reader.result,
                    timestamp: timestamp,
                    type: 'video'
                };
                window.galleryVideos.unshift(videoData);
                localStorage.setItem('galleryVideos', JSON.stringify(window.galleryVideos));
                
                // Immediately update gallery and show the new video
                refreshGallery();
                openGalleryWithNewItem('videos');
            };
            reader.readAsDataURL(lastCapture.blob);
        }
    });
    
    // Open gallery and highlight new item
    function openGalleryWithNewItem(tab) {
        const galleryWindow = document.getElementById('gallery-window');
        galleryWindow.classList.add('active');
        bringToFront(galleryWindow);
        updateTaskbar();
        
        // Switch to correct tab
        const tabs = document.querySelectorAll('.gallery-tab');
        tabs.forEach(t => t.classList.remove('active'));
        
        const photosGrid = document.getElementById('gallery-photos-grid');
        const videosGrid = document.getElementById('gallery-videos-grid');
        
        if (tab === 'photos') {
            document.querySelector('[data-tab="photos"]').classList.add('active');
            photosGrid.style.display = 'grid';
            videosGrid.style.display = 'none';
        } else {
            document.querySelector('[data-tab="videos"]').classList.add('active');
            photosGrid.style.display = 'none';
            videosGrid.style.display = 'grid';
        }
        
        // Highlight the new item
        setTimeout(() => {
            const grid = tab === 'photos' ? photosGrid : videosGrid;
            const firstItem = grid.querySelector('.gallery-item');
            if (firstItem) {
                firstItem.classList.add('new-item');
                setTimeout(() => firstItem.classList.remove('new-item'), 500);
            }
        }, 100);
    }
    
    // Set as wallpaper
    wallpaperCaptureBtn.addEventListener('click', () => {
        if (!lastCapture || lastCaptureType !== 'photo') return;
        setWallpaper(lastCapture, 'cover');
        alert('🎨 Wallpaper updated!');
    });
    
    // Download capture
    downloadCaptureBtn.addEventListener('click', () => {
        if (!lastCapture) return;
        
        const link = document.createElement('a');
        
        if (lastCaptureType === 'photo') {
            link.href = lastCapture;
            link.download = `photo_${Date.now()}.png`;
        } else if (lastCaptureType === 'video') {
            link.href = lastCapture.url;
            link.download = `video_${Date.now()}.webm`;
        }
        
        link.click();
    });
    
    // Save to Guestbook functionality
    const saveGuestbookBtn = document.getElementById('save-guestbook-btn');
    const guestbookNameSection = document.getElementById('guestbook-name-section');
    const guestbookNameInput = document.getElementById('guestbook-name-input');
    const confirmGuestbookBtn = document.getElementById('confirm-guestbook-btn');
    const cancelGuestbookBtn = document.getElementById('cancel-guestbook-btn');
    
    if (saveGuestbookBtn) {
        saveGuestbookBtn.addEventListener('click', () => {
            if (!lastCapture || lastCaptureType !== 'photo') return;
            
            // Show name input section
            guestbookNameSection.style.display = 'block';
            guestbookNameInput.focus();
        });
    }
    
    if (cancelGuestbookBtn) {
        cancelGuestbookBtn.addEventListener('click', () => {
            guestbookNameSection.style.display = 'none';
            guestbookNameInput.value = '';
        });
    }
    
    if (confirmGuestbookBtn) {
        confirmGuestbookBtn.addEventListener('click', async () => {
            if (!lastCapture || lastCaptureType !== 'photo') return;
            
            const name = guestbookNameInput.value.trim() || 'Anonymous Visitor';
            const visitorId = window.visitorId || localStorage.getItem('guestbook_visitor_id');
            
            confirmGuestbookBtn.disabled = true;
            confirmGuestbookBtn.textContent = '⏳ Saving...';
            
            // Compress image before upload (resize to max 800px and use JPEG)
            const compressedImage = await compressImage(lastCapture, 800, 0.7);
            
            try {
                const response = await fetch('/api/guestbook/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: compressedImage,
                        name: name,
                        visitor_id: visitorId
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('🎉 Photo saved to guestbook! Thanks for visiting!');
                    guestbookNameSection.style.display = 'none';
                    guestbookNameInput.value = '';
                    
                    // Open gallery and switch to guestbook tab
                    const galleryWindow = document.getElementById('gallery-window');
                    galleryWindow.classList.add('active');
                    bringToFront(galleryWindow);
                    updateTaskbar();
                    
                    // Switch to guestbook tab
                    document.querySelectorAll('.gallery-tab').forEach(t => t.classList.remove('active'));
                    document.querySelector('[data-tab="guestbook"]').classList.add('active');
                    document.getElementById('gallery-photos-grid').style.display = 'none';
                    document.getElementById('gallery-videos-grid').style.display = 'none';
                    document.getElementById('gallery-guestbook-grid').style.display = 'grid';
                    
                    // Reload guestbook
                    if (window.loadGuestbookPhotos) {
                        window.loadGuestbookPhotos();
                    }
                } else {
                    alert('❌ Failed to save: ' + (result.error || 'Unknown error'));
                }
            } catch (err) {
                alert('❌ Network error. Please try again.');
            }
            
            confirmGuestbookBtn.disabled = false;
            confirmGuestbookBtn.textContent = '✓ Confirm & Save';
        });
    }
    
    // Compress image to reduce upload size
    function compressImage(dataUrl, maxSize, quality) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Scale down if larger than maxSize
                if (width > height && width > maxSize) {
                    height = (height * maxSize) / width;
                    width = maxSize;
                } else if (height > maxSize) {
                    width = (width * maxSize) / height;
                    height = maxSize;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convert to JPEG with compression
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = dataUrl;
        });
    }
})();

// ========== GALLERY FUNCTIONALITY ==========
(function() {
    const photosGrid = document.getElementById('gallery-photos-grid');
    const videosGrid = document.getElementById('gallery-videos-grid');
    const guestbookGrid = document.getElementById('gallery-guestbook-grid');
    const tabs = document.querySelectorAll('.gallery-tab');
    const importBtn = document.getElementById('gallery-import-btn');
    const importVideoBtn = document.getElementById('gallery-import-video-btn');
    const clearBtn = document.getElementById('gallery-clear-btn');
    const fileInput = document.getElementById('gallery-file-input');
    const videoInput = document.getElementById('gallery-video-input');
    const preview = document.getElementById('gallery-preview');
    const previewContent = document.getElementById('gallery-preview-content');
    const previewTitle = document.getElementById('preview-title');
    const closePreviewBtn = document.getElementById('close-preview-btn');
    const previewWallpaperBtn = document.getElementById('preview-wallpaper-btn');
    const previewDownloadBtn = document.getElementById('preview-download-btn');
    const previewDeleteBtn = document.getElementById('preview-delete-btn');
    const photoCountEl = document.getElementById('photo-count');
    const videoCountEl = document.getElementById('video-count');
    const guestbookCountEl = document.getElementById('guestbook-count');
    
    let currentPreviewItem = null;
    let currentPreviewType = null;
    
    // Visitor ID for guestbook
    let visitorId = localStorage.getItem('guestbook_visitor_id');
    if (!visitorId) {
        visitorId = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('guestbook_visitor_id', visitorId);
    }
    window.visitorId = visitorId;
    
    // Default images that come with the portfolio
    const defaultImages = [
        {
            id: 'default-1',
            data: '/static/images/NOV27.png',
            timestamp: '2024-11-27T00:00:00.000Z',
            type: 'photo',
            name: 'NOV27.png',
            isDefault: true
        },
        {
            id: 'default-2',
            data: '/static/images/nov27-2.png',
            timestamp: '2024-11-27T00:00:00.000Z',
            type: 'photo',
            name: 'nov27-2.png',
            isDefault: true
        }
    ];
    
    // Initialize gallery with default images
    function initGalleryWithDefaults() {
        // Load user photos from storage
        let userPhotos = JSON.parse(localStorage.getItem('galleryPhotos') || '[]');
        
        // Filter out any old default images and keep only user photos
        userPhotos = userPhotos.filter(p => !p.isDefault);
        
        // Combine default images with user photos (defaults at the end)
        window.galleryPhotos = [...userPhotos, ...defaultImages];
        
        // Load videos
        window.galleryVideos = JSON.parse(localStorage.getItem('galleryVideos') || '[]');
    }
    
    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const tabName = tab.dataset.tab;
            photosGrid.style.display = tabName === 'photos' ? 'grid' : 'none';
            videosGrid.style.display = tabName === 'videos' ? 'grid' : 'none';
            guestbookGrid.style.display = tabName === 'guestbook' ? 'grid' : 'none';
            
            // Show/hide import buttons based on tab
            if (importBtn) importBtn.style.display = tabName === 'photos' ? 'inline-block' : 'none';
            if (importVideoBtn) importVideoBtn.style.display = tabName === 'videos' ? 'inline-block' : 'none';
            
            // Load guestbook photos when tab is selected
            if (tabName === 'guestbook') {
                loadGuestbookPhotos();
            }
        });
    });
    
    // Load guestbook photos from server
    async function loadGuestbookPhotos() {
        try {
            const response = await fetch('/api/guestbook/photos');
            const data = await response.json();
            
            if (guestbookCountEl) {
                guestbookCountEl.textContent = data.photos ? data.photos.length : 0;
            }
            
            if (!data.photos || data.photos.length === 0) {
                guestbookGrid.innerHTML = `
                    <div class="guestbook-header">
                        <h3>✨ They were all here! ✨</h3>
                    </div>
                    <div class="guestbook-empty">
                        <span>🌟</span>
                        <p>Be the first to leave your mark!</p>
                    </div>
                `;
                return;
            }
            
            guestbookGrid.innerHTML = `
                <div class="guestbook-header">
                    <h3>✨ They were all here! ✨</h3>
                </div>
                ${data.photos.map(photo => `
                    <div class="guestbook-item ${photo.visitor_id === visitorId ? 'own-photo' : ''}" 
                         data-id="${photo.id}" 
                         data-visitor="${photo.visitor_id}"
                         data-url="${photo.image_url}"
                         data-name="${photo.visitor_name}">
                        <img src="${photo.image_url}" alt="${photo.visitor_name}">
                        <div class="guestbook-item-name">${photo.visitor_name}</div>
                        <div class="guestbook-item-date">${new Date(photo.created_at).toLocaleDateString()}</div>
                    </div>
                `).join('')}
            `;
            
            // Add click handlers for ALL guestbook photos to open preview
            attachGuestbookClickHandlers();
        } catch (err) {
            console.error('Failed to load guestbook:', err);
            guestbookGrid.innerHTML = `
                <div class="guestbook-header">
                    <h3>✨ They were all here! ✨</h3>
                </div>
                <div class="guestbook-empty">
                    <span>⚠️</span>
                    <p>Could not load guestbook. Server may not be configured.</p>
                </div>
            `;
        }
    }
    
    // Attach click handlers to guestbook items
    function attachGuestbookClickHandlers() {
        document.querySelectorAll('.guestbook-item').forEach(item => {
            item.addEventListener('click', () => {
                const name = item.dataset.name;
                const date = item.querySelector('.guestbook-item-date').textContent;
                const imgUrl = item.dataset.url;
                const photoId = item.dataset.id;
                const isOwnPhoto = item.classList.contains('own-photo');
                
                previewTitle.textContent = `${name} - ${date}`;
                previewContent.innerHTML = `<img src="${imgUrl}" alt="${name}">`;
                previewWallpaperBtn.style.display = 'inline-block';
                previewDownloadBtn.style.display = 'inline-block';
                
                // Show delete button only for own photos
                if (isOwnPhoto) {
                    previewDeleteBtn.style.display = 'inline-block';
                    previewDeleteBtn.textContent = '🗑️ Delete';
                } else {
                    previewDeleteBtn.style.display = 'none';
                }
                
                preview.style.display = 'block';
                
                currentPreviewItem = { 
                    data: imgUrl, 
                    visitor_name: name, 
                    id: photoId,
                    isOwnPhoto: isOwnPhoto
                };
                currentPreviewType = 'guestbook';
            });
        });
    }
    
    // Real-time guestbook updates via Server-Sent Events
    let guestbookEventSource = null;
    
    function connectGuestbookSSE() {
        if (guestbookEventSource) {
            guestbookEventSource.close();
        }
        
        guestbookEventSource = new EventSource('/api/guestbook/stream');
        
        guestbookEventSource.onmessage = function(event) {
            try {
                const message = JSON.parse(event.data);
                
                if (message.type === 'new_photo') {
                    console.log('🎉 New guestbook photo received!', message.data);
                    // Reload the guestbook to show new photo
                    loadGuestbookPhotos();
                    
                    // Show notification if gallery window is not active
                    const galleryWindow = document.getElementById('gallery-window');
                    if (!galleryWindow.classList.contains('active')) {
                        showGuestbookNotification(message.data.visitor_name);
                    }
                } else if (message.type === 'delete_photo') {
                    console.log('🗑️ Guestbook photo deleted:', message.data);
                    // Reload to reflect deletion
                    loadGuestbookPhotos();
                }
            } catch (err) {
                console.log('SSE message parse error:', err);
            }
        };
        
        guestbookEventSource.onerror = function(err) {
            console.log('SSE connection error, will reconnect...');
            guestbookEventSource.close();
            // Reconnect after 5 seconds
            setTimeout(connectGuestbookSSE, 5000);
        };
    }
    
    // Show notification for new guestbook photo
    function showGuestbookNotification(visitorName) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'guestbook-notification';
        notification.innerHTML = `
            <span>📸</span>
            <span>${visitorName || 'Someone'} just joined the guestbook!</span>
        `;
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
    
    // Start SSE connection when page loads
    connectGuestbookSSE();
    
    // Make loadGuestbookPhotos available globally
    window.loadGuestbookPhotos = loadGuestbookPhotos;
    
    // Initial load - guestbook tab is active by default
    loadGuestbookPhotos();
    
    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const tabName = tab.dataset.tab;
            if (tabName === 'photos') {
                photosGrid.style.display = 'grid';
                videosGrid.style.display = 'none';
            } else {
                photosGrid.style.display = 'none';
                videosGrid.style.display = 'grid';
            }
        });
    });
    
    // Import image
    importBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        for (let file of files) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const photoData = {
                    id: Date.now() + Math.random(),
                    data: event.target.result,
                    timestamp: new Date().toISOString(),
                    type: 'photo',
                    name: file.name
                };
                window.galleryPhotos.unshift(photoData);
                localStorage.setItem('galleryPhotos', JSON.stringify(window.galleryPhotos));
                refreshGallery();
            };
            reader.readAsDataURL(file);
        }
        fileInput.value = '';
    });
    
    // Import video
    importVideoBtn.addEventListener('click', () => videoInput.click());
    videoInput.addEventListener('change', (e) => {
        const files = e.target.files;
        for (let file of files) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const videoData = {
                    id: Date.now() + Math.random(),
                    data: event.target.result,
                    timestamp: new Date().toISOString(),
                    type: 'video',
                    name: file.name
                };
                window.galleryVideos.unshift(videoData);
                localStorage.setItem('galleryVideos', JSON.stringify(window.galleryVideos));
                refreshGallery();
            };
            reader.readAsDataURL(file);
        }
        videoInput.value = '';
    });
    
    // Clear all
    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all photos and videos?')) {
            window.galleryPhotos = [];
            window.galleryVideos = [];
            localStorage.removeItem('galleryPhotos');
            localStorage.removeItem('galleryVideos');
            refreshGallery();
        }
    });
    
    // Refresh gallery
    window.refreshGallery = function() {
        // Re-initialize with defaults and user content
        initGalleryWithDefaults();
        
        // Update counts
        if (photoCountEl) photoCountEl.textContent = window.galleryPhotos.length;
        if (videoCountEl) videoCountEl.textContent = window.galleryVideos.length;
        
        // Render photos
        if (window.galleryPhotos.length === 0) {
            photosGrid.innerHTML = `
                <div class="gallery-empty">
                    <span>📷</span>
                    <p>No photos yet. Capture some with the camera!</p>
                </div>
            `;
        } else {
            photosGrid.innerHTML = window.galleryPhotos.map((photo, index) => `
                <div class="gallery-item ${photo.isDefault ? 'default-item' : ''}" data-type="photo" data-index="${index}">
                    <img src="${photo.data}" alt="Photo ${index + 1}">
                    <span class="gallery-item-type">${photo.isDefault ? '📌' : '📷'}</span>
                </div>
            `).join('');
        }
        
        // Render videos
        if (window.galleryVideos.length === 0) {
            videosGrid.innerHTML = `
                <div class="gallery-empty">
                    <span>🎥</span>
                    <p>No videos yet. Record some with the camera!</p>
                </div>
            `;
        } else {
            videosGrid.innerHTML = window.galleryVideos.map((video, index) => `
                <div class="gallery-item" data-type="video" data-index="${index}">
                    <video src="${video.data}" muted></video>
                    <span class="gallery-item-type">🎥</span>
                </div>
            `).join('');
        }
        
        // Add click handlers
        document.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const type = item.dataset.type;
                const index = parseInt(item.dataset.index);
                openPreview(type, index);
            });
        });
    };
    
    // Open preview
    function openPreview(type, index) {
        currentPreviewType = type;
        
        if (type === 'photo') {
            currentPreviewItem = window.galleryPhotos[index];
            previewContent.innerHTML = `<img src="${currentPreviewItem.data}" alt="Preview">`;
            previewWallpaperBtn.style.display = 'inline-block';
            // Show delete button (but not for default images)
            previewDeleteBtn.style.display = 'inline-block';
            previewDeleteBtn.textContent = '🗑️ Delete';
        } else {
            currentPreviewItem = window.galleryVideos[index];
            previewContent.innerHTML = `<video src="${currentPreviewItem.data}" controls></video>`;
            previewWallpaperBtn.style.display = 'none';
            previewDeleteBtn.style.display = 'inline-block';
            previewDeleteBtn.textContent = '🗑️ Delete';
        }
        
        previewTitle.textContent = currentPreviewItem.name || `${type} - ${new Date(currentPreviewItem.timestamp).toLocaleString()}`;
        previewDownloadBtn.style.display = 'inline-block';
        preview.style.display = 'block';
    }
    
    // Close preview
    closePreviewBtn.addEventListener('click', () => {
        preview.style.display = 'none';
        currentPreviewItem = null;
        currentPreviewType = null;
    });
    
    // Set as wallpaper
    previewWallpaperBtn.addEventListener('click', () => {
        if (currentPreviewItem) {
            if (currentPreviewType === 'photo') {
                setWallpaper(currentPreviewItem.data, 'cover');
                alert('🎨 Wallpaper updated!');
                preview.style.display = 'none';
            } else if (currentPreviewType === 'guestbook') {
                setWallpaper(currentPreviewItem.data, 'cover');
                alert('🎨 Wallpaper updated!');
                preview.style.display = 'none';
            }
        }
    });
    
    // Download
    previewDownloadBtn.addEventListener('click', () => {
        if (!currentPreviewItem) return;
        
        const link = document.createElement('a');
        if (currentPreviewType === 'guestbook') {
            link.href = currentPreviewItem.data;
            link.download = `guestbook_${currentPreviewItem.visitor_name || 'photo'}_${Date.now()}.png`;
        } else {
            link.href = currentPreviewItem.data;
            link.download = currentPreviewItem.name || `${currentPreviewType}_${Date.now()}.${currentPreviewType === 'photo' ? 'png' : 'webm'}`;
        }
        link.click();
    });
    
    // Delete
    previewDeleteBtn.addEventListener('click', async () => {
        if (!currentPreviewItem) return;
        
        // Prevent deleting default images
        if (currentPreviewItem.isDefault) {
            alert('Cannot delete default portfolio images!');
            return;
        }
        
        // Handle guestbook deletion
        if (currentPreviewType === 'guestbook') {
            if (!currentPreviewItem.isOwnPhoto) {
                alert('You can only delete your own photos!');
                return;
            }
            
            if (confirm('Delete your photo from the guestbook?')) {
                try {
                    const res = await fetch(`/api/guestbook/delete/${currentPreviewItem.id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ visitor_id: visitorId })
                    });
                    const result = await res.json();
                    if (result.success) {
                        preview.style.display = 'none';
                        loadGuestbookPhotos();
                    } else {
                        alert('Failed to delete: ' + result.error);
                    }
                } catch (err) {
                    alert('Network error');
                }
            }
            return;
        }
        
        // Handle gallery photo/video deletion
        if (confirm('Delete this item?')) {
            if (currentPreviewType === 'photo') {
                // Only remove from user photos in storage
                let userPhotos = JSON.parse(localStorage.getItem('galleryPhotos') || '[]');
                userPhotos = userPhotos.filter(p => p.id !== currentPreviewItem.id);
                localStorage.setItem('galleryPhotos', JSON.stringify(userPhotos));
            } else {
                window.galleryVideos = window.galleryVideos.filter(v => v.id !== currentPreviewItem.id);
                localStorage.setItem('galleryVideos', JSON.stringify(window.galleryVideos));
            }
            preview.style.display = 'none';
            refreshGallery();
        }
    });
    
    // Initial load
    refreshGallery();
})();

// ========== WALLPAPER FUNCTIONALITY ==========
(function() {
    const desktop = document.getElementById('desktop');
    const previewInner = document.getElementById('wallpaper-preview-inner');
    const wallpaperList = document.getElementById('wallpaper-list');
    const fromGalleryBtn = document.getElementById('wallpaper-from-gallery-btn');
    const fromFileBtn = document.getElementById('wallpaper-from-file-btn');
    const fileInput = document.getElementById('wallpaper-file-input');
    const displayMode = document.getElementById('wallpaper-display-mode');
    const applyBtn = document.getElementById('apply-wallpaper-btn');
    const resetBtn = document.getElementById('reset-wallpaper-btn');
    
    // Preset wallpapers
    const presets = {
        'default': { type: 'color', value: '#008080' },
        'clouds': { type: 'gradient', value: 'linear-gradient(to bottom, #87ceeb, #fff)' },
        'sunset': { type: 'gradient', value: 'linear-gradient(to bottom, #ff7e5f, #feb47b)' },
        'forest': { type: 'gradient', value: 'linear-gradient(to bottom, #2d5016, #228b22)' },
        'ocean': { type: 'gradient', value: 'linear-gradient(to bottom, #1e3c72, #2a5298)' },
        'night': { type: 'gradient', value: 'linear-gradient(to bottom, #0f0c29, #302b63, #24243e)' }
    };
    
    let selectedWallpaper = localStorage.getItem('selectedWallpaper') || 'default';
    let customWallpaper = localStorage.getItem('customWallpaper') || null;
    let currentDisplayMode = localStorage.getItem('wallpaperDisplayMode') || 'cover';
    
    // Initialize
    function init() {
        loadSavedWallpaper();
        displayMode.value = currentDisplayMode;
        updatePreview();
    }
    
    // Load saved wallpaper
    function loadSavedWallpaper() {
        if (customWallpaper) {
            setWallpaper(customWallpaper, currentDisplayMode);
        } else if (presets[selectedWallpaper]) {
            applyPreset(selectedWallpaper);
        }
        
        // Update selection
        document.querySelectorAll('.wallpaper-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.wallpaper === selectedWallpaper && !customWallpaper) {
                item.classList.add('active');
            }
        });
    }
    
    // Apply preset
    function applyPreset(name) {
        const preset = presets[name];
        if (!preset) return;
        
        if (preset.type === 'color') {
            desktop.style.background = preset.value;
            desktop.style.backgroundImage = 'none';
        } else {
            desktop.style.background = preset.value;
        }
    }
    
    // Set custom wallpaper
    window.setWallpaper = function(imageData, mode = 'cover') {
        desktop.style.backgroundImage = `url(${imageData})`;
        desktop.style.backgroundSize = mode === 'repeat' ? 'auto' : mode;
        desktop.style.backgroundPosition = 'center';
        desktop.style.backgroundRepeat = mode === 'repeat' ? 'repeat' : 'no-repeat';
        
        // Save
        customWallpaper = imageData;
        currentDisplayMode = mode;
        localStorage.setItem('customWallpaper', imageData);
        localStorage.setItem('wallpaperDisplayMode', mode);
        
        // Update preview
        updatePreview();
    };
    
    // Update preview
    function updatePreview() {
        if (customWallpaper) {
            previewInner.style.backgroundImage = `url(${customWallpaper})`;
            previewInner.style.backgroundSize = currentDisplayMode === 'repeat' ? 'auto' : currentDisplayMode;
            previewInner.style.backgroundPosition = 'center';
            previewInner.style.backgroundRepeat = currentDisplayMode === 'repeat' ? 'repeat' : 'no-repeat';
        } else if (presets[selectedWallpaper]) {
            const preset = presets[selectedWallpaper];
            previewInner.style.backgroundImage = 'none';
            previewInner.style.background = preset.value;
        }
    }
    
    // Wallpaper item click
    wallpaperList.addEventListener('click', (e) => {
        const item = e.target.closest('.wallpaper-item');
        if (!item) return;
        
        document.querySelectorAll('.wallpaper-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        selectedWallpaper = item.dataset.wallpaper;
        customWallpaper = null;
        localStorage.removeItem('customWallpaper');
        
        applyPreset(selectedWallpaper);
        updatePreview();
    });
    
    // From gallery
    fromGalleryBtn.addEventListener('click', () => {
        if (window.galleryPhotos.length === 0) {
            alert('No photos in gallery. Capture or import some first!');
            return;
        }
        
        // Open gallery and let user select
        openWindow('gallery-window');
        alert('Select a photo from the gallery and click "Set as Wallpaper"');
    });
    
    // From file
    fromFileBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setWallpaper(event.target.result, displayMode.value);
                
                // Clear preset selection
                document.querySelectorAll('.wallpaper-item').forEach(i => i.classList.remove('active'));
            };
            reader.readAsDataURL(file);
        }
        fileInput.value = '';
    });
    
    // Display mode change
    displayMode.addEventListener('change', () => {
        currentDisplayMode = displayMode.value;
        if (customWallpaper) {
            setWallpaper(customWallpaper, currentDisplayMode);
        }
    });
    
    // Apply button
    applyBtn.addEventListener('click', () => {
        localStorage.setItem('selectedWallpaper', selectedWallpaper);
        localStorage.setItem('wallpaperDisplayMode', currentDisplayMode);
        alert('Wallpaper settings applied!');
    });
    
    // Reset button
    resetBtn.addEventListener('click', () => {
        selectedWallpaper = 'default';
        customWallpaper = null;
        currentDisplayMode = 'cover';
        
        localStorage.removeItem('customWallpaper');
        localStorage.setItem('selectedWallpaper', 'default');
        localStorage.setItem('wallpaperDisplayMode', 'cover');
        
        applyPreset('default');
        displayMode.value = 'cover';
        
        document.querySelectorAll('.wallpaper-item').forEach(i => i.classList.remove('active'));
        document.querySelector('[data-wallpaper="default"]').classList.add('active');
        
        updatePreview();
    });
    
    init();
})();

// ========== MINI MUSIC PLAYER FUNCTIONALITY ==========
(function() {
    const miniAudio = document.getElementById('mini-audio-player');
    const miniPlayBtn = document.getElementById('mini-play');
    const miniPauseBtn = document.getElementById('mini-pause');
    const miniStopBtn = document.getElementById('mini-stop');
    const miniPrevBtn = document.getElementById('mini-prev');
    const miniNextBtn = document.getElementById('mini-next');
    const miniProgressBar = document.getElementById('mini-progress-bar');
    const miniProgressContainer = document.getElementById('mini-progress-container');
    const miniVolumeSlider = document.getElementById('mini-volume');
    const miniTrackName = document.getElementById('mini-track-name');
    const miniCurrentTime = document.getElementById('mini-current-time');
    const miniTotalTime = document.getElementById('mini-total-time');
    const miniPlaylist = document.getElementById('mini-playlist');
    const miniFileInput = document.getElementById('mini-file-input');
    const miniCloseBtn = document.getElementById('mini-close');
    const miniPlayer = document.getElementById('mini-player');
    const expandPlaylistBtn = document.getElementById('expand-playlist');

    let currentTrackIndex = -1;
    let miniPlaylistItems = [];

    function initMiniPlayer() {
        miniPlaylistItems = Array.from(miniPlaylist.querySelectorAll('.mini-playlist-item'));
        miniAudio.volume = 0.7;
        
        // Auto-load first track
        if (miniPlaylistItems.length > 0) {
            loadTrack(0);
        }
    }

    function loadTrack(index) {
        if (index < 0 || index >= miniPlaylistItems.length) return;

        currentTrackIndex = index;
        const item = miniPlaylistItems[index];
        const url = item.dataset.url;
        const name = item.querySelector('span').textContent;

        miniAudio.src = url;
        miniTrackName.textContent = name;

        miniPlaylistItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        miniAudio.load();
    }

    miniPlayBtn.addEventListener('click', () => {
        if (currentTrackIndex === -1 && miniPlaylistItems.length > 0) {
            loadTrack(0);
        }
        
        miniAudio.play().then(() => {
            miniPlayBtn.style.display = 'none';
            miniPauseBtn.style.display = 'flex';
        }).catch(err => {
            console.log('Play error:', err);
        });
    });

    miniPauseBtn.addEventListener('click', () => {
        miniAudio.pause();
        miniPauseBtn.style.display = 'none';
        miniPlayBtn.style.display = 'flex';
    });

    miniStopBtn.addEventListener('click', () => {
        miniAudio.pause();
        miniAudio.currentTime = 0;
        miniPauseBtn.style.display = 'none';
        miniPlayBtn.style.display = 'flex';
    });

    miniPrevBtn.addEventListener('click', () => {
        if (currentTrackIndex > 0) {
            loadTrack(currentTrackIndex - 1);
            miniAudio.play().then(() => {
                miniPlayBtn.style.display = 'none';
                miniPauseBtn.style.display = 'flex';
            });
        }
    });

    miniNextBtn.addEventListener('click', () => {
        if (currentTrackIndex < miniPlaylistItems.length - 1) {
            loadTrack(currentTrackIndex + 1);
            miniAudio.play().then(() => {
                miniPlayBtn.style.display = 'none';
                miniPauseBtn.style.display = 'flex';
            });
        }
    });

    miniAudio.addEventListener('ended', () => {
        if (currentTrackIndex < miniPlaylistItems.length - 1) {
            loadTrack(currentTrackIndex + 1);
            miniAudio.play();
        } else {
            miniPauseBtn.style.display = 'none';
            miniPlayBtn.style.display = 'flex';
        }
    });

    miniAudio.addEventListener('timeupdate', () => {
        if (miniAudio.duration) {
            const progress = (miniAudio.currentTime / miniAudio.duration) * 100;
            miniProgressBar.style.width = progress + '%';
            miniCurrentTime.textContent = formatTime(miniAudio.currentTime);
        }
    });

    miniAudio.addEventListener('loadedmetadata', () => {
        miniTotalTime.textContent = formatTime(miniAudio.duration);
    });

    miniAudio.addEventListener('error', (e) => {
        console.log('Audio error:', e);
        miniTrackName.textContent = 'Error loading track';
    });

    miniProgressContainer.addEventListener('click', (e) => {
        if (miniAudio.duration) {
            const rect = miniProgressContainer.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            miniAudio.currentTime = percentage * miniAudio.duration;
        }
    });

    miniVolumeSlider.addEventListener('input', (e) => {
        miniAudio.volume = e.target.value / 100;
    });

    function formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    miniPlaylist.addEventListener('click', (e) => {
        const item = e.target.closest('.mini-playlist-item');
        if (!item) return;

        const index = miniPlaylistItems.indexOf(item);
        loadTrack(index);
        miniAudio.play().then(() => {
            miniPlayBtn.style.display = 'none';
            miniPauseBtn.style.display = 'flex';
        });
    });

    document.querySelector('.mini-upload-label').addEventListener('click', () => {
        miniFileInput.click();
    });

    miniFileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const url = URL.createObjectURL(file);
            const name = file.name.replace(/\.[^/.]+$/, "");

            const item = document.createElement('div');
            item.className = 'mini-playlist-item';
            item.dataset.url = url;
            item.innerHTML = `<span>🎵 ${name}</span>`;

            miniPlaylist.appendChild(item);
            miniPlaylistItems.push(item);
        }

        miniFileInput.value = '';
    });

    miniCloseBtn.addEventListener('click', () => {
        miniPlayer.style.display = 'none';
    });

    expandPlaylistBtn.addEventListener('click', () => {
        miniPlaylist.classList.toggle('collapsed');
        expandPlaylistBtn.textContent = miniPlaylist.classList.contains('collapsed') ? '▶' : '▼';
    });

    initMiniPlayer();
})();

// ========== ANONYMOUS MESSAGE FUNCTIONALITY ==========
(function() {
    const messageTextarea = document.getElementById('anonymous-message');
    const sendBtn = document.getElementById('send-message-btn');
    const clearBtn = document.getElementById('clear-message-btn');
    const statusDiv = document.getElementById('message-status');
    
    if (sendBtn) {
        sendBtn.addEventListener('click', async () => {
            const message = messageTextarea.value.trim();
            
            if (!message) {
                statusDiv.innerHTML = '<span style="color: red;">❌ Please enter a message</span>';
                return;
            }
            
            try {
                const response = await fetch('/api/send-message', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    statusDiv.innerHTML = '<span style="color: green;">✅ Message sent successfully!</span>';
                    messageTextarea.value = '';
                } else {
                    statusDiv.innerHTML = `<span style="color: red;">❌ ${result.error || 'Failed to send'}</span>`;
                }
            } catch (error) {
                statusDiv.innerHTML = '<span style="color: red;">❌ Network error</span>';
            }
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            messageTextarea.value = '';
            statusDiv.innerHTML = '';
        });
    }
})();

// ========== CV REFRESH BUTTON ==========
const cvRefreshBtn = document.getElementById('cv-refresh-btn');
if (cvRefreshBtn) {
    cvRefreshBtn.addEventListener('click', () => {
        const iframe = document.getElementById('cv-iframe');
        iframe.src = iframe.src;
    });
}

// ========== INITIALIZATION ON PAGE LOAD ==========
document.addEventListener('DOMContentLoaded', () => {
    // Update taskbar to show initially open windows
    updateTaskbar();
    
    // Focus terminal input if terminal is open
    const terminalWindow = document.getElementById('terminal-window');
    if (terminalWindow && terminalWindow.classList.contains('active')) {
        const terminalInput = document.getElementById('terminal-input');
        if (terminalInput) {
            setTimeout(() => terminalInput.focus(), 100);
        }
    }
});