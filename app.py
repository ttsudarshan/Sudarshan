"""
Windows 95 Portfolio - Flask Backend
Interactive terminal interface for portfolio website
WITH REAL-TIME GUESTBOOK UPDATES via Server-Sent Events (SSE)
"""

from flask import Flask, request, jsonify, render_template, send_from_directory, Response
from flask_cors import CORS
import os
import json
from datetime import datetime
import uuid
import base64
import requests
import queue
import threading

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Supabase Configuration - Set these as environment variables
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')
SUPABASE_BUCKET = 'guestbook-photos'

def get_supabase_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }

# ============================================================================
# SERVER-SENT EVENTS (SSE) FOR REAL-TIME GUESTBOOK UPDATES
# ============================================================================

# Thread-safe list of client queues for SSE
sse_clients = []
sse_clients_lock = threading.Lock()

def broadcast_guestbook_event(event_type, data):
    """Send event to all connected SSE clients"""
    message = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    
    with sse_clients_lock:
        # Send to all clients, remove disconnected ones
        disconnected = []
        for client_queue in sse_clients:
            try:
                client_queue.put_nowait(message)
            except:
                disconnected.append(client_queue)
        
        # Clean up disconnected clients
        for q in disconnected:
            if q in sse_clients:
                sse_clients.remove(q)

def sse_stream():
    """Generator function for SSE stream"""
    client_queue = queue.Queue(maxsize=100)
    
    with sse_clients_lock:
        sse_clients.append(client_queue)
    
    try:
        # Send initial connection message
        yield "event: connected\ndata: {\"status\": \"connected\"}\n\n"
        
        while True:
            try:
                # Wait for messages with timeout (keeps connection alive)
                message = client_queue.get(timeout=30)
                yield message
            except queue.Empty:
                # Send heartbeat to keep connection alive
                yield ": heartbeat\n\n"
    except GeneratorExit:
        pass
    finally:
        with sse_clients_lock:
            if client_queue in sse_clients:
                sse_clients.remove(client_queue)

@app.route('/api/guestbook/stream')
def guestbook_stream():
    """SSE endpoint for real-time guestbook updates"""
    return Response(
        sse_stream(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',  # Disable nginx buffering
            'Access-Control-Allow-Origin': '*'
        }
    )

# ============================================================================
# VIRTUAL FILE SYSTEM - Maps to your portfolio HTML sections
# ============================================================================

VIRTUAL_FS = {
    'type': 'directory',
    'contents': {
        'Bio.txt': {
            'type': 'file',
            'icon': '💻',
            'window': 'about',
            'content': '''╔══════════════════════════════════════════════════════════════╗
║                    SUDARSHAN TIWARI                          ║
║              Computer Science Student & Developer             ║
╚══════════════════════════════════════════════════════════════╝

Hi! I'm a Computer Science student at Missouri State University 
specializing in full-stack development, Linux kernel programming, 
and cloud architecture.

EDUCATION:
──────────────────────────────────────────────────────────────────
  Missouri State University - Springfield, Missouri
  Bachelor of Science in Computer Science
  Jan 2023 - Dec 2026 (Expected)

EXPERIENCE:
──────────────────────────────────────────────────────────────────
  ► Software Developer Intern - TuningSQL (Aug 2025 - Present)
    • Full-stack web platform (PostgreSQL, PHP, JavaScript, Backbone.js)
    • PHP backend endpoints for HTML DOM transformation
    • Real-time validation and AJAX operations

  ► Research Assistant - Missouri State University (May 2024 - Present)
    • Kernel-level memory management subsystem (C/C++)
    • Multi-threaded daemon for memory reclamation
    • Benchmarking experiments for hybrid memory workloads

SPECIALIZATIONS:
──────────────────────────────────────────────────────────────────
  • Full-Stack Development (React, Node.js, Angular, Django)
  • Linux Kernel & System Programming (C/C++)
  • Cloud Architecture (Azure, Docker, Heroku)
  • Real-Time Systems (SignalR, WebSocket)
  • Database Design (MongoDB, PostgreSQL, SQL Server)

STATUS: Open to internship opportunities!
'''
        },
        'Projects': {
            'type': 'directory',
            'icon': '📁',
            'window': 'projects',
            'contents': {
                'SocialMedia.md': {
                    'type': 'file',
                    'content': '''💬 SOCIAL MEDIA WEB APP
═══════════════════════════════════════════════════════════════
Tech Stack: C#, Angular, SignalR, SQL Server, OAuth 2.0, JWT

Description:
Full-stack social platform with user authentication, real-time 
chat using SignalR, posts/comments system, and RESTful API backend.

Features:
  • Real-time messaging with SignalR
  • OAuth 2.0 and JWT authentication
  • Post and comment system
  • User profiles and connections
'''
                },
                'PlacementTracker.md': {
                    'type': 'file',
                    'content': '''📊 PLACEMENT TRACKER DASHBOARD
═══════════════════════════════════════════════════════════════
Tech Stack: React.js, Node.js, Express.js, MySQL, Tailwind CSS

Description:
Comprehensive job application tracker with REST API, CRUD operations,
search/filter functionality, and responsive dashboard.

Features:
  • Track job applications
  • Search and filter
  • Dashboard analytics
  • Responsive design
'''
                },
                'CustomShell.md': {
                    'type': 'file',
                    'content': '''🖥️ CUSTOM COMMAND SHELL
═══════════════════════════════════════════════════════════════
Tech Stack: C, Unix System Calls, Process Management

Description:
Unix-like shell supporting built-in commands (cd, pwd, exit), 
external command execution via fork/exec, I/O redirection, 
and background process management.

Features:
  • Built-in commands (cd, pwd, exit)
  • External command execution
  • I/O redirection (>, <, >>)
  • Background processes (&)
  • Command history
'''
                },
                'TuningSQL.md': {
                    'type': 'file',
                    'content': '''🗄️ TUNINGSQL CONTENT PLATFORM
═══════════════════════════════════════════════════════════════
Tech Stack: PostgreSQL, PHP, Backbone.js, DOMDocument, XPath

Description:
Full-stack web content transformation platform with PHP backend 
for HTML DOM manipulation and Backbone.js frontend.

Features:
  • HTML DOM transformation
  • Real-time validation
  • Content management system
'''
                },
                'Win95Portfolio.md': {
                    'type': 'file',
                    'content': '''💻 WINDOWS 95 PORTFOLIO (You're Here!)
═══════════════════════════════════════════════════════════════
Tech Stack: HTML5, CSS3, JavaScript, Python Flask

Description:
Interactive retro portfolio with draggable windows, working terminal,
and authentic Windows 95 UI.

Features:
  • Draggable & resizable windows
  • Working command-line terminal
  • Virtual file system
  • Music player
  • Start menu
'''
                }
            }
        },
        'Skills.doc': {
            'type': 'file',
            'icon': '📄',
            'window': 'skills',
            'content': '''╔══════════════════════════════════════════════════════════════╗
║                       TECHNICAL SKILLS                        ║
╚══════════════════════════════════════════════════════════════╝

LANGUAGES:
──────────────────────────────────────────────────────────────────
  █████████████████████░░░░  JavaScript   ████ Advanced
  █████████████████████░░░░  Python       ████ Advanced
  ████████████████░░░░░░░░░  C/C++        ███░ Intermediate
  ████████████████░░░░░░░░░  PHP          ███░ Intermediate
  ████████████████░░░░░░░░░  C#           ███░ Intermediate
  █████████████████████░░░░  HTML/CSS     ████ Advanced
  ████████████░░░░░░░░░░░░░  Go           ██░░ Learning

FRAMEWORKS & LIBRARIES:
──────────────────────────────────────────────────────────────────
  Frontend:  React, Angular, Backbone.js, Tailwind CSS
  Backend:   Flask, Express.js, Django, ASP.NET
  Database:  PostgreSQL, MySQL, MongoDB, SQL Server

TOOLS & PLATFORMS:
──────────────────────────────────────────────────────────────────
  • Linux / Linux Mint (Expert)
  • Git / GitHub
  • Docker
  • Azure Cloud
  • VS Code
  • Heroku
'''
        },
        'Honors.txt': {
            'type': 'file',
            'icon': '🏆',
            'window': 'honors',
            'content': '''╔══════════════════════════════════════════════════════════════╗
║                    HONORS & ACHIEVEMENTS                      ║
╚══════════════════════════════════════════════════════════════╝

ACADEMIC HONORS:
──────────────────────────────────────────────────────────────────
  🏆 Dean's List - Missouri State University
  🏆 International Student Academic Excellence Award

CERTIFICATIONS:
──────────────────────────────────────────────────────────────────
  📜 CodePath Web Development (Web102)
  📜 AWS Cloud Practitioner (In Progress)

ACTIVITIES:
──────────────────────────────────────────────────────────────────
  • Association for Computing Machinery (ACM) Member
  • Open Source Contributor
  • Hackathon Participant
'''
        },
        'Contact.txt': {
            'type': 'file',
            'icon': '✉️',
            'window': 'contact',
            'content': '''╔══════════════════════════════════════════════════════════════╗
║                      CONTACT INFORMATION                      ║
╚══════════════════════════════════════════════════════════════╝

📧 Email:    st582s@missouristate.edu
📱 Phone:    703-762-6809
📍 Location: Springfield, Missouri

ONLINE PRESENCE:
──────────────────────────────────────────────────────────────────
  🔗 GitHub:   github.com/ttsudarshan
  💼 LinkedIn: linkedin.com/in/ttsudarshan

I'm actively seeking internship opportunities!
Feel free to reach out for collaborations or opportunities.
'''
        },
        'CV.pdf': {
            'type': 'file',
            'icon': '📋',
            'window': 'cv',
            'content': '''[PDF Document]
══════════════════════════════════════════════════════════════════
Resume available for download at:
https://github.com/ttsudarshan/Resume/raw/main/Sudarshan_Tiwaari_resume.pdf

Type 'open CV.pdf' to view in PDF viewer window.
══════════════════════════════════════════════════════════════════
'''
        }
    }
}

MESSAGES_FILE = 'anonymous_messages.json'

@app.route('/api/send-message', methods=['POST'])
def send_anonymous_message():
    try:
        data = request.json
        message = data.get('message', '').strip()
        
        if not message:
            return jsonify({'success': False, 'error': 'Message cannot be empty'})
        
        # Load existing messages
        try:
            with open(MESSAGES_FILE, 'r') as f:
                messages = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            messages = []
        
        # Add new message
        new_message = {
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'id': len(messages) + 1
        }
        messages.append(new_message)
        
        # Save back to file (max 1000 messages)
        if len(messages) > 1000:
            messages = messages[-1000:]
        
        with open(MESSAGES_FILE, 'w') as f:
            json.dump(messages, f, indent=2)
        
        return jsonify({'success': True})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/admin/messages')
def view_messages():
    """Page where you can view all messages"""
    try:
        with open(MESSAGES_FILE, 'r') as f:
            messages = json.load(f)
    except FileNotFoundError:
        messages = []
    
    # Sort by newest first
    messages.sort(key=lambda x: x['timestamp'], reverse=True)
    
    # Create HTML page to display messages
    html = """
    <html>
    <head>
        <title>Anonymous Messages - Sudarshan's Portfolio</title>
        <style>
            body { 
                font-family: 'MS Sans Serif', Arial, sans-serif; 
                margin: 20px; 
                background: #c0c0c0;
                border: 2px solid;
                border-color: #dfdfdf #808080 #808080 #dfdfdf;
                padding: 20px;
            }
            .header { 
                background: #000080; 
                color: white; 
                padding: 10px; 
                margin-bottom: 15px;
                border: 2px solid;
                border-color: #dfdfdf #808080 #808080 #dfdfdf;
            }
            .message { 
                background: white; 
                border: 2px solid;
                border-color: #808080 #dfdfdf #dfdfdf #808080;
                margin: 10px 0; 
                padding: 15px; 
            }
            .timestamp { 
                color: #666; 
                font-size: 11px; 
                margin-top: 8px;
            }
            .message-id {
                background: #000080;
                color: white;
                padding: 2px 6px;
                font-size: 10px;
                border-radius: 3px;
            }
            .button-95 {
                padding: 5px 15px;
                background: #c0c0c0;
                border: 2px solid;
                border-color: #dfdfdf #808080 #808080 #dfdfdf;
                font-family: 'MS Sans Serif', Arial, sans-serif;
                cursor: pointer;
                margin: 5px;
            }
            .button-95:active {
                border-color: #808080 #dfdfdf #dfdfdf #808080;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>📨 Anonymous Messages Received</h1>
            <p>Total Messages: """ + str(len(messages)) + """</p>
            <button class="button-95" onclick="location.reload()">Refresh</button>
            <button class="button-95" onclick="window.location.href='/'">Back to Portfolio</button>
        </div>
    """
    
    if not messages:
        html += """
        <div class="message">
            <p>No messages yet. Check back later!</p>
        </div>
        """
    else:
        for msg in messages:
            # Format timestamp nicely
            dt = datetime.fromisoformat(msg['timestamp'].replace('Z', '+00:00'))
            formatted_time = dt.strftime('%Y-%m-%d %I:%M %p')
            
            html += f"""
            <div class="message">
                <span class="message-id">Message #{msg['id']}</span>
                <p style="margin: 10px 0; font-size: 14px; line-height: 1.4;">{msg['message']}</p>
                <div class="timestamp">
                    📅 Received: {formatted_time}
                </div>
            </div>
            """
    
    html += "</body></html>"
    return html

# ============================================================================
# GUESTBOOK API ROUTES - Visitor Photos with Supabase + REAL-TIME SSE
# ============================================================================

@app.route('/api/guestbook/photos', methods=['GET'])
def get_guestbook_photos():
    """Get all guestbook photos from Supabase"""
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            return jsonify({'success': False, 'error': 'Supabase not configured', 'photos': []})
        
        # Query Supabase for photos
        response = requests.get(
            f'{SUPABASE_URL}/rest/v1/guestbook_photos?select=*&order=created_at.desc',
            headers=get_supabase_headers()
        )
        
        if response.status_code == 200:
            photos = response.json()
            return jsonify({'success': True, 'photos': photos})
        else:
            return jsonify({'success': False, 'error': 'Failed to fetch photos', 'photos': []})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e), 'photos': []})

@app.route('/api/guestbook/upload', methods=['POST'])
def upload_guestbook_photo():
    """Upload a new guestbook photo - NOW WITH REAL-TIME BROADCAST"""
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            return jsonify({'success': False, 'error': 'Supabase not configured'})
        
        data = request.json
        image_data = data.get('image')  # Base64 image
        visitor_name = data.get('name', 'Anonymous')[:50]  # Limit name length
        visitor_id = data.get('visitor_id')  # Unique ID for this visitor's session
        
        if not image_data or not visitor_id:
            return jsonify({'success': False, 'error': 'Missing image or visitor ID'})
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}.png"
        
        # Remove data URL prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        # Upload image to Supabase Storage
        image_bytes = base64.b64decode(image_data)
        
        upload_response = requests.post(
            f'{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{filename}',
            headers={
                'apikey': SUPABASE_KEY,
                'Authorization': f'Bearer {SUPABASE_KEY}',
                'Content-Type': 'image/png'
            },
            data=image_bytes
        )
        
        if upload_response.status_code not in [200, 201]:
            return jsonify({'success': False, 'error': 'Failed to upload image'})
        
        # Get public URL for the image
        image_url = f'{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{filename}'
        
        # Save photo metadata to database
        created_at = datetime.utcnow().isoformat()
        photo_data = {
            'visitor_name': visitor_name,
            'visitor_id': visitor_id,
            'image_url': image_url,
            'filename': filename,
            'created_at': created_at
        }
        
        db_response = requests.post(
            f'{SUPABASE_URL}/rest/v1/guestbook_photos',
            headers={**get_supabase_headers(), 'Prefer': 'return=representation'},
            json=photo_data
        )
        
        if db_response.status_code in [200, 201]:
            # Get the created photo with ID from response
            created_photo = db_response.json()
            if isinstance(created_photo, list) and len(created_photo) > 0:
                created_photo = created_photo[0]
            else:
                created_photo = photo_data
            
            # ========================================
            # BROADCAST TO ALL CONNECTED SSE CLIENTS
            # ========================================
            broadcast_guestbook_event('new_photo', created_photo)
            
            return jsonify({'success': True, 'photo': created_photo})
        else:
            return jsonify({'success': False, 'error': 'Failed to save photo metadata'})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/guestbook/delete/<photo_id>', methods=['DELETE'])
def delete_guestbook_photo(photo_id):
    """Delete a guestbook photo (only by owner or admin) - NOW WITH REAL-TIME BROADCAST"""
    try:
        if not SUPABASE_URL or not SUPABASE_KEY:
            return jsonify({'success': False, 'error': 'Supabase not configured'})
        
        data = request.json
        visitor_id = data.get('visitor_id')
        is_admin = data.get('admin_key') == os.environ.get('ADMIN_KEY', 'your-secret-admin-key')
        
        # First, get the photo to check ownership and get filename
        photo_response = requests.get(
            f'{SUPABASE_URL}/rest/v1/guestbook_photos?id=eq.{photo_id}&select=*',
            headers=get_supabase_headers()
        )
        
        if photo_response.status_code != 200 or not photo_response.json():
            return jsonify({'success': False, 'error': 'Photo not found'})
        
        photo = photo_response.json()[0]
        
        # Check if user owns this photo or is admin
        if not is_admin and photo.get('visitor_id') != visitor_id:
            return jsonify({'success': False, 'error': 'Not authorized to delete this photo'})
        
        # Delete from storage
        filename = photo.get('filename')
        if filename:
            requests.delete(
                f'{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{filename}',
                headers={
                    'apikey': SUPABASE_KEY,
                    'Authorization': f'Bearer {SUPABASE_KEY}'
                }
            )
        
        # Delete from database
        delete_response = requests.delete(
            f'{SUPABASE_URL}/rest/v1/guestbook_photos?id=eq.{photo_id}',
            headers=get_supabase_headers()
        )
        
        if delete_response.status_code in [200, 204]:
            # ========================================
            # BROADCAST DELETE TO ALL SSE CLIENTS
            # ========================================
            broadcast_guestbook_event('delete_photo', {'id': photo_id})
            
            return jsonify({'success': True})
        else:
            return jsonify({'success': False, 'error': 'Failed to delete photo'})
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/admin/guestbook')
def admin_guestbook():
    """Admin page to view and manage guestbook photos"""
    admin_key = request.args.get('key', '')
    expected_key = os.environ.get('ADMIN_KEY', 'your-secret-admin-key')
    
    if admin_key != expected_key:
        return "Unauthorized. Add ?key=YOUR_ADMIN_KEY to access.", 403
    
    html = """
    <html>
    <head>
        <title>Guestbook Admin - Sudarshan's Portfolio</title>
        <style>
            body { font-family: 'MS Sans Serif', Arial; margin: 20px; background: #c0c0c0; }
            .header { background: #000080; color: white; padding: 10px; margin-bottom: 15px; }
            .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
            .photo-card { background: white; padding: 10px; border: 2px solid #808080; }
            .photo-card img { width: 100%; height: 150px; object-fit: cover; }
            .photo-card p { margin: 5px 0; font-size: 12px; }
            .delete-btn { background: #ff4444; color: white; border: none; padding: 5px 10px; cursor: pointer; }
        </style>
    </head>
    <body>
        <div class="header"><h1>📸 Guestbook Admin</h1></div>
        <div id="photos" class="photo-grid">Loading...</div>
        <script>
            const ADMIN_KEY = '""" + expected_key + """';
            async function loadPhotos() {
                const res = await fetch('/api/guestbook/photos');
                const data = await res.json();
                const container = document.getElementById('photos');
                if (!data.photos || data.photos.length === 0) {
                    container.innerHTML = '<p>No photos yet</p>';
                    return;
                }
                container.innerHTML = data.photos.map(p => `
                    <div class="photo-card">
                        <img src="${p.image_url}" alt="${p.visitor_name}">
                        <p><strong>${p.visitor_name}</strong></p>
                        <p>${new Date(p.created_at).toLocaleString()}</p>
                        <p style="font-size:10px;color:#666;">ID: ${p.visitor_id}</p>
                        <button class="delete-btn" onclick="deletePhoto('${p.id}')">Delete</button>
                    </div>
                `).join('');
            }
            async function deletePhoto(id) {
                if (!confirm('Delete this photo?')) return;
                await fetch('/api/guestbook/delete/' + id, {
                    method: 'DELETE',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ admin_key: ADMIN_KEY })
                });
                loadPhotos();
            }
            loadPhotos();
        </script>
    </body>
    </html>
    """
    return html


# ============================================================================
# TERMINAL SHELL SESSION MANAGEMENT
# ============================================================================

sessions = {}

class PortfolioShell:
    def __init__(self, session_id):
        self.session_id = session_id
        self.current_path = '/home/sudarshan/Portfolio'
        self.current_fs = VIRTUAL_FS
        self.history = []
        self.username = 'sudarshan'
        self.hostname = 'portfolio'
        
    def get_prompt(self):
        return f'{self.current_path}$ '
    
    def execute(self, command):
        """Execute a shell command"""
        self.history.append(command)
        
        parts = command.strip().split()
        if not parts:
            return {'output': '', 'type': 'info', 'prompt': self.get_prompt()}
        
        cmd = parts[0].lower()
        args = parts[1:] if len(parts) > 1 else []
        
        # Command mapping
        commands = {
            'help': self.cmd_help,
            '?': self.cmd_help,
            'ls': self.cmd_ls,
            'dir': self.cmd_ls,
            'cd': self.cmd_cd,
            'cat': self.cmd_cat,
            'type': self.cmd_cat,
            'pwd': self.cmd_pwd,
            'clear': self.cmd_clear,
            'cls': self.cmd_clear,
            'tree': self.cmd_tree,
            'open': self.cmd_open,
            'whoami': self.cmd_whoami,
            'hostname': self.cmd_hostname,
            'neofetch': self.cmd_neofetch,
            'echo': self.cmd_echo,
            'date': self.cmd_date,
            'time': self.cmd_time,
            'history': self.cmd_history,
            'exit': self.cmd_exit,
            'quit': self.cmd_exit,
            'logout': self.cmd_exit,
            'uname': self.cmd_uname,
            'uptime': self.cmd_uptime,
            'man': self.cmd_man,
            'touch': self.cmd_touch,
            'mkdir': self.cmd_mkdir,
            'rm': self.cmd_rm,
            'grep': self.cmd_grep,
            'find': self.cmd_find,
            'head': self.cmd_head,
            'tail': self.cmd_tail,
            'wc': self.cmd_wc,
        }
        
        if cmd in commands:
            result = commands[cmd](args)
            result['prompt'] = self.get_prompt()
            return result
        else:
            return {
                'output': f"'{cmd}' is not recognized as an internal or external command.\nType 'help' for available commands.",
                'type': 'error',
                'prompt': self.get_prompt()
            }
    
    def cmd_help(self, args):
        """Show available commands"""
        help_text = '''╔══════════════════════════════════════════════════════════════╗
║               PORTFOLIO SHELL - COMMAND HELP                  ║
╚══════════════════════════════════════════════════════════════╝

NAVIGATION:
  ls, dir          List directory contents
  cd <dir>         Change directory (cd .., cd ~, cd Projects)
  pwd              Print working directory
  tree             Show directory tree

FILE OPERATIONS:
  cat <file>       Display file contents
  open <file>      Open file in GUI window
  head <file>      Show first 10 lines
  tail <file>      Show last 10 lines
  wc <file>        Word/line/character count
  grep <pat> <f>   Search for pattern in file
  find <name>      Find files matching name

SYSTEM INFO:
  whoami           Display current user
  hostname         Display system name
  neofetch         Display system info (fancy)
  uname            System information
  uptime           Show uptime
  date             Show current date
  time             Show current time

MISC:
  echo <text>      Print text
  history          Command history
  clear, cls       Clear screen
  man <cmd>        Show manual for command
  help, ?          Show this help
  exit, quit       Close terminal

TIP: Use 'open <filename>' to open files in their GUI windows!
'''
        return {'output': help_text, 'type': 'info'}
    
    def cmd_ls(self, args):
        """List directory contents"""
        if self.current_fs.get('type') != 'directory':
            return {'output': 'Not a directory', 'type': 'error'}
        
        contents = self.current_fs.get('contents', {})
        if not contents:
            return {'output': '(empty directory)', 'type': 'info'}
        
        output = []
        for name, item in sorted(contents.items()):
            if item['type'] == 'directory':
                icon = item.get('icon', '📁')
                output.append(f'  {icon} {name}/')
            else:
                icon = item.get('icon', '📄')
                output.append(f'  {icon} {name}')
        
        return {'output': '\n'.join(output), 'type': 'success'}
    
    def cmd_cd(self, args):
        """Change directory"""
        if not args:
            return {'output': 'Usage: cd <directory>', 'type': 'error'}
        
        target = args[0]
        
        if target == '~' or target == '/home/sudarshan/Portfolio':
            self.current_path = '/home/sudarshan/Portfolio'
            self.current_fs = VIRTUAL_FS
            return {'output': '', 'type': 'success'}
        
        if target == '..':
            if self.current_path != '/home/sudarshan/Portfolio':
                path_parts = self.current_path.split('/')
                path_parts.pop()
                self.current_path = '/'.join(path_parts)
                
                # Navigate to parent in FS
                rel_path = self.current_path.replace('/home/sudarshan/Portfolio', '').strip('/')
                self.current_fs = VIRTUAL_FS
                if rel_path:
                    for part in rel_path.split('/'):
                        if self.current_fs.get('type') == 'directory':
                            contents = self.current_fs.get('contents', {})
                            for name, item in contents.items():
                                if name.lower() == part.lower():
                                    self.current_fs = item
                                    break
            return {'output': '', 'type': 'success'}
        
        # Try to find the directory
        if self.current_fs.get('type') == 'directory':
            contents = self.current_fs.get('contents', {})
            for name, item in contents.items():
                if name.lower() == target.lower() and item['type'] == 'directory':
                    self.current_fs = item
                    self.current_path = f'{self.current_path}/{name}'
                    return {'output': '', 'type': 'success'}
        
        return {'output': f"cd: {target}: No such directory", 'type': 'error'}
    
    def cmd_cat(self, args):
        """Display file contents"""
        if not args:
            return {'output': 'Usage: cat <filename>', 'type': 'error'}
        
        filename = args[0]
        
        if self.current_fs.get('type') == 'directory':
            contents = self.current_fs.get('contents', {})
            for name, item in contents.items():
                if name.lower() == filename.lower() and item['type'] == 'file':
                    return {'output': item.get('content', '(empty file)'), 'type': 'success'}
        
        return {'output': f"cat: {filename}: No such file", 'type': 'error'}
    
    def cmd_pwd(self, args):
        """Print working directory"""
        return {'output': self.current_path, 'type': 'success'}
    
    def cmd_clear(self, args):
        """Clear screen"""
        return {'output': '', 'type': 'clear'}
    
    def cmd_tree(self, args):
        """Show directory tree"""
        def build_tree(node, prefix='', is_last=True):
            lines = []
            connector = '└── ' if is_last else '├── '
            
            if node.get('type') == 'directory':
                contents = node.get('contents', {})
                items = list(contents.items())
                
                for i, (name, item) in enumerate(sorted(items)):
                    is_item_last = (i == len(items) - 1)
                    item_connector = '└── ' if is_item_last else '├── '
                    
                    if item['type'] == 'directory':
                        icon = item.get('icon', '📁')
                        lines.append(f'{prefix}{item_connector}{icon} {name}/')
                        extension = '    ' if is_item_last else '│   '
                        lines.extend(build_tree(item, prefix + extension, is_item_last))
                    else:
                        icon = item.get('icon', '📄')
                        lines.append(f'{prefix}{item_connector}{icon} {name}')
            
            return lines
        
        tree_lines = ['📁 Portfolio/'] + build_tree(VIRTUAL_FS)
        return {'output': '\n'.join(tree_lines), 'type': 'success'}
    
    def cmd_open(self, args):
        """Open file in GUI window"""
        if not args:
            return {'output': 'Usage: open <filename>', 'type': 'error'}
        
        filename = args[0]
        
        # Search in current directory
        if self.current_fs.get('type') == 'directory':
            contents = self.current_fs.get('contents', {})
            for name, item in contents.items():
                if name.lower() == filename.lower():
                    window = item.get('window')
                    if window:
                        return {
                            'output': f'Opening {name}...',
                            'type': 'open',
                            'window': window
                        }
                    else:
                        return {'output': f"No GUI viewer for {name}", 'type': 'error'}
        
        return {'output': f"open: {filename}: No such file", 'type': 'error'}
    
    def cmd_whoami(self, args):
        """Display current user"""
        return {'output': self.username, 'type': 'success'}
    
    def cmd_hostname(self, args):
        """Display hostname"""
        return {'output': self.hostname, 'type': 'success'}
    
    def cmd_neofetch(self, args):
        """Display fancy system info"""
        neofetch = '''
        ██╗    ██╗██╗███╗   ██╗ █████╗ ███████╗
        ██║    ██║██║████╗  ██║██╔══██╗██╔════╝
        ██║ █╗ ██║██║██╔██╗ ██║╚██████║███████╗
        ██║███╗██║██║██║╚██╗██║ ╚═══██║╚════██║
        ╚███╔███╔╝██║██║ ╚████║ █████╔╝███████║
         ╚══╝╚══╝ ╚═╝╚═╝  ╚═══╝ ╚════╝ ╚══════╝
        ──────────────────────────────────────────
        OS:        Portfolio OS 95
        Host:      sudarshantwry.org
        Kernel:    Flask 2.0
        Uptime:    Since Jan 2023
        Shell:     PortfolioShell v1.0
        Theme:     Windows 95 Classic
        Terminal:  Web Terminal
        CPU:       JavaScript V8
        Memory:    LocalStorage
        ──────────────────────────────────────────
        User:      Sudarshan Tiwari
        Role:      CS Student & Developer
        Location:  Springfield, MO
        Status:    Open to Opportunities!
'''
        return {'output': neofetch, 'type': 'success'}
    
    def cmd_echo(self, args):
        """Echo text"""
        return {'output': ' '.join(args) if args else '', 'type': 'success'}
    
    def cmd_date(self, args):
        """Show current date"""
        from datetime import datetime
        return {'output': datetime.now().strftime('%A, %B %d, %Y'), 'type': 'success'}
    
    def cmd_time(self, args):
        """Show current time"""
        from datetime import datetime
        return {'output': datetime.now().strftime('%I:%M:%S %p'), 'type': 'success'}
    
    def cmd_history(self, args):
        """Show command history"""
        if not self.history:
            return {'output': '(no history)', 'type': 'info'}
        
        output = []
        for i, cmd in enumerate(self.history[-20:], 1):
            output.append(f'  {i}  {cmd}')
        
        return {'output': '\n'.join(output), 'type': 'success'}
    
    def cmd_exit(self, args):
        """Exit terminal"""
        return {'output': 'Goodbye! 👋', 'type': 'exit'}
    
    def cmd_uname(self, args):
        """System information"""
        return {'output': 'PortfolioOS 95 x86_64 Flask/2.0', 'type': 'success'}
    
    def cmd_uptime(self, args):
        """Show uptime"""
        return {'output': ' up since Jan 2023, 1 user, load average: 0.42, 0.37, 0.35', 'type': 'success'}
    
    def cmd_man(self, args):
        """Manual pages"""
        if not args:
            return {'output': 'What manual page do you want?\nUsage: man <command>', 'type': 'error'}
        
        manuals = {
            'ls': 'ls - list directory contents\nUsage: ls [directory]',
            'cd': 'cd - change directory\nUsage: cd <directory>\nExamples: cd Projects, cd .., cd ~',
            'cat': 'cat - concatenate and display files\nUsage: cat <filename>',
            'pwd': 'pwd - print working directory\nUsage: pwd',
            'help': 'help - display available commands\nUsage: help',
            'open': 'open - open file in GUI window\nUsage: open <filename>',
            'tree': 'tree - display directory tree\nUsage: tree',
        }
        
        cmd = args[0].lower()
        if cmd in manuals:
            return {'output': f'MANUAL: {cmd}\n{"─" * 40}\n{manuals[cmd]}', 'type': 'info'}
        return {'output': f'No manual entry for {cmd}', 'type': 'error'}
    
    def cmd_touch(self, args):
        """Touch command (simulated)"""
        if not args:
            return {'output': 'Usage: touch <filename>', 'type': 'error'}
        return {'output': f'touch: cannot create "{args[0]}": Read-only file system', 'type': 'error'}
    
    def cmd_mkdir(self, args):
        """Mkdir command (simulated)"""
        if not args:
            return {'output': 'Usage: mkdir <dirname>', 'type': 'error'}
        return {'output': f'mkdir: cannot create directory "{args[0]}": Read-only file system', 'type': 'error'}
    
    def cmd_rm(self, args):
        """Rm command (simulated)"""
        if not args:
            return {'output': 'Usage: rm <filename>', 'type': 'error'}
        return {'output': f'rm: cannot remove "{args[0]}": Read-only file system', 'type': 'error'}
    
    def cmd_grep(self, args):
        """Search in file"""
        if len(args) < 2:
            return {'output': 'Usage: grep <pattern> <filename>', 'type': 'error'}
        
        pattern = args[0].lower()
        filename = args[1]
        
        if self.current_fs.get('type') == 'directory':
            contents = self.current_fs.get('contents', {})
            for name, item in contents.items():
                if name.lower() == filename.lower() and item['type'] == 'file':
                    content = item.get('content', '')
                    matches = [line for line in content.split('\n') if pattern in line.lower()]
                    if matches:
                        return {'output': '\n'.join(matches), 'type': 'success'}
                    return {'output': f'No matches found for "{pattern}"', 'type': 'info'}
        
        return {'output': f"grep: {filename}: No such file", 'type': 'error'}
    
    def cmd_find(self, args):
        """Find files"""
        if not args:
            return {'output': 'Usage: find <n>', 'type': 'error'}
        
        pattern = args[0].lower()
        results = []
        
        def search(node, path):
            if node.get('type') == 'directory':
                for name, item in node.get('contents', {}).items():
                    full_path = f"{path}/{name}"
                    if pattern in name.lower():
                        results.append(full_path)
                    if item.get('type') == 'directory':
                        search(item, full_path)
        
        search(VIRTUAL_FS, '.')
        
        if results:
            return {'output': '\n'.join(results), 'type': 'success'}
        return {'output': f'No files matching "{pattern}" found', 'type': 'info'}
    
    def cmd_head(self, args):
        """Show first lines of file"""
        if not args:
            return {'output': 'Usage: head <filename>', 'type': 'error'}
        
        filename = args[0]
        n = 10
        
        if self.current_fs.get('type') == 'directory':
            contents = self.current_fs.get('contents', {})
            for name, item in contents.items():
                if name.lower() == filename.lower() and item['type'] == 'file':
                    lines = item.get('content', '').split('\n')[:n]
                    return {'output': '\n'.join(lines), 'type': 'success'}
        
        return {'output': f"head: {filename}: No such file", 'type': 'error'}
    
    def cmd_tail(self, args):
        """Show last lines of file"""
        if not args:
            return {'output': 'Usage: tail <filename>', 'type': 'error'}
        
        filename = args[0]
        n = 10
        
        if self.current_fs.get('type') == 'directory':
            contents = self.current_fs.get('contents', {})
            for name, item in contents.items():
                if name.lower() == filename.lower() and item['type'] == 'file':
                    lines = item.get('content', '').split('\n')[-n:]
                    return {'output': '\n'.join(lines), 'type': 'success'}
        
        return {'output': f"tail: {filename}: No such file", 'type': 'error'}
    
    def cmd_wc(self, args):
        """Word count"""
        if not args:
            return {'output': 'Usage: wc <filename>', 'type': 'error'}
        
        filename = args[0]
        
        if self.current_fs.get('type') == 'directory':
            contents = self.current_fs.get('contents', {})
            for name, item in contents.items():
                if name.lower() == filename.lower() and item['type'] == 'file':
                    content = item.get('content', '')
                    lines = len(content.split('\n'))
                    words = len(content.split())
                    chars = len(content)
                    return {'output': f'  {lines} lines, {words} words, {chars} characters', 'type': 'success'}
        
        return {'output': f"wc: {filename}: No such file", 'type': 'error'}


# ============================================================================
# API ROUTES
# ============================================================================

@app.route('/')
def index():
    """Serve main page"""
    return render_template('index.html')

@app.route('/api/execute', methods=['POST'])
def execute_command():
    """API endpoint to execute commands"""
    try:
        data = request.json
        command = data.get('command', '').strip()
        session_id = data.get('session_id', 'default')
        
        if not command:
            shell = sessions.get(session_id, PortfolioShell(session_id))
            return jsonify({'output': '', 'type': 'info', 'prompt': shell.get_prompt()})
        
        # Get or create shell session
        if session_id not in sessions:
            sessions[session_id] = PortfolioShell(session_id)
        
        shell = sessions[session_id]
        result = shell.execute(command)
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({
            'output': f'Error: {str(e)}',
            'type': 'error',
            'prompt': '/home/sudarshan/Portfolio$ '
        }), 500

@app.route('/api/session', methods=['GET'])
def get_session():
    """Create new session"""
    session_id = str(uuid.uuid4())
    sessions[session_id] = PortfolioShell(session_id)
    shell = sessions[session_id]
    return jsonify({
        'session_id': session_id,
        'prompt': shell.get_prompt()
    })

@app.route('/api/autocomplete', methods=['POST'])
def autocomplete():
    """Tab completion"""
    try:
        data = request.json
        partial = data.get('partial', '')
        session_id = data.get('session_id', 'default')
        
        if session_id not in sessions:
            sessions[session_id] = PortfolioShell(session_id)
        
        shell = sessions[session_id]
        
        # Get completions from current directory
        completions = []
        if shell.current_fs.get('type') == 'directory':
            for name in shell.current_fs.get('contents', {}).keys():
                if name.lower().startswith(partial.lower()):
                    completions.append(name)
        
        return jsonify({'completions': completions})
    
    except Exception as e:
        return jsonify({'completions': []})


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print("=" * 60)
    print("  Windows 95 Portfolio Shell Server")
    print("  WITH REAL-TIME GUESTBOOK SSE SUPPORT")
    print(f"  Starting on port {port}")
    print("=" * 60)
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)