"""
Windows 95 Portfolio - Flask Backend
Interactive terminal interface for portfolio website
"""

from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import os
import json
from datetime import datetime
import uuid


app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

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

# Session storage
sessions = {}

class PortfolioShell:
    """Virtual shell for portfolio interaction"""
    
    def __init__(self, session_id):
        self.session_id = session_id
        self.current_dir = '/home/sudarshan/Portfolio'
        self.current_fs = VIRTUAL_FS
        self.path_stack = []
        self.history = []
        self.max_history = 50
        self.env = {
            'USER': 'sudarshan',
            'HOME': '/home/sudarshan/Portfolio',
            'SHELL': '/bin/myshell',
            'PWD': '/home/sudarshan/Portfolio'
        }
    
    def get_prompt(self):
        """Get the shell prompt"""
        return f"{self.current_dir}$ "
    
    def navigate_to_path(self, path):
        """Navigate to a path and return the filesystem node"""
        if path == '/' or path == '~' or path == self.env['HOME']:
            return VIRTUAL_FS, []
        
        # Handle absolute vs relative path
        if path.startswith('/home/sudarshan/Portfolio'):
            parts = path.replace('/home/sudarshan/Portfolio', '').strip('/').split('/')
        elif path.startswith('/'):
            return None, []
        else:
            parts = path.strip('/').split('/')
        
        parts = [p for p in parts if p]  # Remove empty strings
        
        current = VIRTUAL_FS
        path_stack = []
        
        for part in parts:
            if part == '..':
                if path_stack:
                    path_stack.pop()
                    # Navigate back
                    current = VIRTUAL_FS
                    for p in path_stack:
                        current = current['contents'][p]
            elif part == '.':
                continue
            elif current.get('type') == 'directory' and part in current.get('contents', {}):
                if current['contents'][part].get('type') == 'directory':
                    current = current['contents'][part]
                    path_stack.append(part)
                else:
                    return None, []  # Trying to cd into a file
            else:
                return None, []
        
        return current, path_stack
    
    def execute(self, command):
        """Execute a shell command"""
        if not command.strip():
            return {'output': '', 'type': 'info', 'prompt': self.get_prompt()}
        
        # Add to history
        self.history.insert(0, command)
        if len(self.history) > self.max_history:
            self.history.pop()
        
        # Parse command
        parts = command.strip().split()
        cmd = parts[0].lower()
        args = parts[1:] if len(parts) > 1 else []
        
        # Command mapping
        commands = {
            'help': self.cmd_help,
            'pwd': self.cmd_pwd,
            'whoami': self.cmd_whoami,
            'cd': self.cmd_cd,
            'ls': self.cmd_ls,
            'dir': self.cmd_ls,
            'cat': self.cmd_cat,
            'clear': self.cmd_clear,
            'cls': self.cmd_clear,
            'history': self.cmd_history,
            'exit': self.cmd_exit,
            'quit': self.cmd_exit,
            'echo': self.cmd_echo,
            'date': self.cmd_date,
            'time': self.cmd_time,
            'open': self.cmd_open,
            'tree': self.cmd_tree,
            'neofetch': self.cmd_neofetch,
            'env': self.cmd_env,
            'export': self.cmd_export,
            'uname': self.cmd_uname,
            'hostname': self.cmd_hostname,
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
        else:
            result = {
                'output': f"bash: {cmd}: command not found\nType 'help' for available commands.",
                'type': 'error'
            }
        
        result['prompt'] = self.get_prompt()
        return result
    
    def cmd_help(self, args):
        """Help command"""
        help_text = '''
╔═══════════════════════════════════════════════════════════════════╗
║                    MyShell - Available Commands                    ║
╚═══════════════════════════════════════════════════════════════════╝

 NAVIGATION:
   pwd              Print current working directory
   cd <dir>         Change directory (cd .., cd ~, cd Projects)
   ls / dir         List directory contents
   tree             Show directory tree

 FILE OPERATIONS:
   cat <file>       Display file contents
   head <file>      Show first 10 lines
   tail <file>      Show last 10 lines
   wc <file>        Word/line count
   grep <str> <f>   Search in file
   find <name>      Find files by name
   open <file>      Open file in GUI window

 SYSTEM INFO:
   whoami           Display current user
   hostname         Show hostname
   uname            System information
   uptime           System uptime
   neofetch         System info (fancy)
   date             Show current date
   time             Show current time
   env              Show environment variables

 UTILITIES:
   echo <text>      Print text
   clear / cls      Clear the screen
   history          Show command history
   man <cmd>        Show manual for command
   help             Display this help message
   exit / quit      Exit the shell

╔═══════════════════════════════════════════════════════════════════╗
║  TIP: Use 'cat Bio.txt' to read files, 'ls Projects' to explore   ║
╚═══════════════════════════════════════════════════════════════════╝
'''
        return {'output': help_text, 'type': 'info'}
    
    def cmd_pwd(self, args):
        """Print working directory"""
        return {'output': self.current_dir, 'type': 'success'}
    
    def cmd_whoami(self, args):
        """Display user info"""
        output = f'''╔═══════════════════════════════════════╗
║            USER INFORMATION           ║
╚═══════════════════════════════════════╝
  User:     sudarshan
  Role:     Portfolio Owner
  Status:   CS Student | Software Developer
  Location: Springfield, MO
  Shell:    /bin/myshell
'''
        return {'output': output, 'type': 'success'}
    
    def cmd_cd(self, args):
        """Change directory"""
        if not args or args[0] in ['~', '/']:
            self.current_dir = '/home/sudarshan/Portfolio'
            self.current_fs = VIRTUAL_FS
            self.path_stack = []
            return {'output': '', 'type': 'success'}
        
        target = args[0]
        
        if target == '..':
            if self.path_stack:
                self.path_stack.pop()
                self.current_fs = VIRTUAL_FS
                for p in self.path_stack:
                    self.current_fs = self.current_fs['contents'][p]
                self.current_dir = '/home/sudarshan/Portfolio'
                if self.path_stack:
                    self.current_dir += '/' + '/'.join(self.path_stack)
            return {'output': '', 'type': 'success'}
        
        # Try to navigate to target
        if self.current_fs.get('type') == 'directory':
            contents = self.current_fs.get('contents', {})
            # Case-insensitive search
            for name, item in contents.items():
                if name.lower() == target.lower() and item.get('type') == 'directory':
                    self.path_stack.append(name)
                    self.current_fs = item
                    self.current_dir = '/home/sudarshan/Portfolio/' + '/'.join(self.path_stack)
                    return {'output': '', 'type': 'success'}
        
        return {'output': f"cd: {target}: No such directory", 'type': 'error'}
    
    def cmd_ls(self, args):
        """List directory contents"""
        target_fs = self.current_fs
        
        # If argument provided, try to list that directory
        if args:
            target = args[0]
            if target_fs.get('type') == 'directory':
                for name, item in target_fs.get('contents', {}).items():
                    if name.lower() == target.lower():
                        if item.get('type') == 'directory':
                            target_fs = item
                            break
                        else:
                            return {'output': f"  {item.get('icon', '📄')} {name}", 'type': 'info'}
        
        if target_fs.get('type') != 'directory':
            return {'output': 'Not a directory', 'type': 'error'}
        
        contents = target_fs.get('contents', {})
        if not contents:
            return {'output': 'Directory is empty', 'type': 'info'}
        
        output_lines = []
        dirs = []
        files = []
        
        for name, item in sorted(contents.items()):
            icon = item.get('icon', '📄' if item['type'] == 'file' else '📁')
            if item['type'] == 'directory':
                dirs.append(f"  {icon} {name}/")
            else:
                files.append(f"  {icon} {name}")
        
        output_lines.extend(dirs)
        output_lines.extend(files)
        
        return {'output': '\n'.join(output_lines), 'type': 'info'}
    
    def cmd_cat(self, args):
        """Display file contents"""
        if not args:
            return {'output': 'Usage: cat <filename>', 'type': 'error'}
        
        filename = args[0]
        
        if self.current_fs.get('type') == 'directory':
            contents = self.current_fs.get('contents', {})
            for name, item in contents.items():
                if name.lower() == filename.lower():
                    if item['type'] == 'directory':
                        return {'output': f"cat: {filename}: Is a directory", 'type': 'error'}
                    return {'output': item.get('content', ''), 'type': 'success'}
        
        return {'output': f"cat: {filename}: No such file", 'type': 'error'}
    
    def cmd_clear(self, args):
        """Clear screen"""
        return {'output': '', 'type': 'clear'}
    
    def cmd_history(self, args):
        """Show command history"""
        if not self.history:
            return {'output': 'No command history', 'type': 'info'}
        
        lines = ['Command History:', '─' * 40]
        for i, cmd in enumerate(reversed(self.history[-20:]), 1):
            lines.append(f'  {i:3d}  {cmd}')
        
        return {'output': '\n'.join(lines), 'type': 'info'}
    
    def cmd_exit(self, args):
        """Exit shell"""
        return {'output': 'Goodbye! 👋', 'type': 'exit'}
    
    def cmd_echo(self, args):
        """Echo text"""
        text = ' '.join(args)
        # Handle environment variables
        for key, value in self.env.items():
            text = text.replace(f'${key}', value)
        return {'output': text, 'type': 'success'}
    
    def cmd_date(self, args):
        """Show date"""
        return {'output': datetime.now().strftime('%A, %B %d, %Y'), 'type': 'success'}
    
    def cmd_time(self, args):
        """Show time"""
        return {'output': datetime.now().strftime('%H:%M:%S'), 'type': 'success'}
    
    def cmd_open(self, args):
        """Open file in GUI window"""
        if not args:
            return {'output': 'Usage: open <filename>', 'type': 'error'}
        
        filename = args[0]
        
        if self.current_fs.get('type') == 'directory':
            contents = self.current_fs.get('contents', {})
            for name, item in contents.items():
                if name.lower() == filename.lower():
                    window = item.get('window')
                    if window:
                        return {
                            'output': f'Opening {name}...',
                            'type': 'open_window',
                            'window': window
                        }
                    return {'output': f'Cannot open {name} in GUI', 'type': 'error'}
        
        return {'output': f"open: {filename}: No such file", 'type': 'error'}
    
    def cmd_tree(self, args):
        """Show directory tree"""
        def build_tree(node, prefix='', is_last=True):
            lines = []
            contents = node.get('contents', {})
            items = list(contents.items())
            
            for i, (name, item) in enumerate(items):
                is_last_item = (i == len(items) - 1)
                connector = '└── ' if is_last_item else '├── '
                icon = item.get('icon', '📁' if item['type'] == 'directory' else '📄')
                
                lines.append(f"{prefix}{connector}{icon} {name}")
                
                if item['type'] == 'directory':
                    extension = '    ' if is_last_item else '│   '
                    lines.extend(build_tree(item, prefix + extension, is_last_item))
            
            return lines
        
        tree_lines = ['📁 Portfolio', '│']
        tree_lines.extend(build_tree(VIRTUAL_FS))
        
        return {'output': '\n'.join(tree_lines), 'type': 'info'}
    
    def cmd_neofetch(self, args):
        """System info fancy display"""
        output = '''
                   _,met$$$$$gg.          sudarshan@portfolio
                ,g$$$$$$$$$$$$$$$P.       ──────────────────────
              ,g$$P"     """Y$$.".        OS: Windows 95 Portfolio Edition
             ,$$P'              `$$$.     Host: Sudarshan Tiwari
            ',$$P       ,ggs.     `$$b:   Kernel: Tiwari Custom Kernel
            `d$$'     ,$P"'   .    $$$    Uptime: Since NOV 2025
             $$P      d$'     ,    $$P    Shell: MyShell 1.0
             $$:      $$.   -    ,d$$'    Terminal: Win95 Terminal
             $$;      Y$b._   _,d$P'      CPU: Ryzen 7 4800h
             Y$$.    `.`"Y$$$$P"'         Memory: 1337MB / ∞MB
             `$$b      "-.__              Disk: AWS
              `Y$$                        
               `Y$$.                      LANGUAGES: JS, Python, C/C++, PHP
                 `$$b.                    FRAMEWORKS: React, Flask, Angular
                   `Y$$b.                 TOOLS: Git, Docker, Linux
                     `"Y$b._              
                        `"""              ████████████████████████████

'''
        return {'output': output, 'type': 'success'}
    
    def cmd_env(self, args):
        """Show environment variables"""
        lines = ['Environment Variables:', '─' * 40]
        for key, value in self.env.items():
            lines.append(f'  {key}={value}')
        return {'output': '\n'.join(lines), 'type': 'info'}
    
    def cmd_export(self, args):
        """Set environment variable"""
        if not args or '=' not in args[0]:
            return {'output': 'Usage: export VAR=value', 'type': 'error'}
        
        key, value = args[0].split('=', 1)
        self.env[key] = value
        return {'output': '', 'type': 'success'}
    
    def cmd_uname(self, args):
        """System information"""
        if args and '-a' in args:
            return {'output': 'Windows95 Portfolio 1.0 sudarshan-pc x86_64 MyShell', 'type': 'success'}
        return {'output': 'Windows95 Portfolio', 'type': 'success'}
    
    def cmd_hostname(self, args):
        """Show hostname"""
        return {'output': 'sudarshan-portfolio', 'type': 'success'}
    
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
            return {'output': 'Usage: find <name>', 'type': 'error'}
        
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
    print(f"  Starting on port {port}")
    print("=" * 60)
    app.run(host='0.0.0.0', port=port, debug=False)  # ← KEY CHANGE
