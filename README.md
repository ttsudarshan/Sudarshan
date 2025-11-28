# Windows 95 Portfolio with Working Terminal

A retro Windows 95-styled portfolio website with a **fully functional command-line terminal** powered by a Python Flask backend.

## 🖥️ Features

- **Authentic Windows 95 UI** - Draggable & resizable windows, taskbar, start menu
- **Working Terminal** - Real command-line interface with 20+ commands
- **Virtual File System** - Navigate through your portfolio using `ls`, `cd`, `cat`
- **Music Player** - Mini media player with playlist support
- **Responsive Design** - Works on desktop and mobile

## 📁 Project Structure

```
win95-portfolio/
├── app.py              # Flask backend with shell commands
├── requirements.txt    # Python dependencies
├── static/
│   ├── style.css       # Windows 95 styling + terminal CSS
│   └── script.js       # Window management + terminal JS
└── templates/
    └── index.html      # Main portfolio page
```

### 3. Open in Browser

Navigate to: https://sudarshandev.onrender.com/

## ⌨️ Terminal Commands

| Command | Description |
|---------|-------------|
| `help` | Show all available commands |
| `ls` / `dir` | List directory contents |
| `cd <dir>` | Change directory |
| `cat <file>` | Display file contents |
| `pwd` | Print working directory |
| `tree` | Show directory tree |
| `open <file>` | Open file in GUI window |
| `whoami` | Display user info |
| `neofetch` | System info (fancy) |
| `grep <pattern> <file>` | Search in file |
| `find <name>` | Find files |
| `head <file>` | Show first 10 lines |
| `tail <file>` | Show last 10 lines |
| `wc <file>` | Word/line count |
| `date` / `time` | Show current date/time |
| `history` | Command history |
| `clear` / `cls` | Clear screen |
| `exit` / `quit` | Close terminal |

## 📂 Virtual File System

The terminal navigates a virtual file system that maps to your portfolio:

```
/home/sudarshan/Portfolio/
├── Bio.txt          → Opens About window
├── Projects/        → Directory with project files
│   ├── SocialMedia.md
│   ├── PlacementTracker.md
│   ├── CustomShell.md
│   └── TuningSQL.md
├── Skills.doc       → Opens Skills window
├── Honors.txt       → Opens Honors window
├── Contact.txt      → Opens Contact window
└── CV.pdf           → Opens CV window
```

## 💡 Example Terminal Session

```bash
/home/sudarshan/Portfolio$ ls
  📁 Projects/
  💻 Bio.txt
  📄 Skills.doc
  🏆 Honors.txt
  ✉️ Contact.txt
  📋 CV.pdf

/home/sudarshan/Portfolio$ cat Bio.txt
[Shows your bio content]

/home/sudarshan/Portfolio$ cd Projects
/home/sudarshan/Portfolio/Projects$ ls
  📄 SocialMedia.md
  📄 PlacementTracker.md
  📄 CustomShell.md
  📄 TuningSQL.md

/home/sudarshan/Portfolio/Projects$ cat SocialMedia.md
[Shows project details]

/home/sudarshan/Portfolio/Projects$ open Bio.txt
Opening Bio.txt...
[Opens the Bio window in the GUI]

/home/sudarshan/Portfolio$ neofetch
[Shows fancy system info]
```

## 🔧 Customization

### Adding New Files to Virtual FS

Edit the `VIRTUAL_FS` dictionary in `app.py`:

```python
'YourFile.txt': {
    'type': 'file',
    'icon': '📝',
    'window': 'your-window',  # Opens this window with 'open' command
    'content': '''Your file content here...'''
}
```

### Adding New Commands

Add a new method to the `PortfolioShell` class:

```python
def cmd_yourcommand(self, args):
    """Your command description"""
    return {'output': 'Your output', 'type': 'success'}
```

Then add it to the commands dictionary in `execute()`.

## 🌐 Deployment

### Deploy to Heroku

1. Create `Procfile`:
```
web: gunicorn app:app
```

2. Add gunicorn to requirements.txt
3. Deploy:
```bash
heroku create your-portfolio
git push heroku main
```

### Deploy to Railway/Render

Both support Flask out of the box - just connect your repo!

## 📝 License

MIT License - Feel free to use for your own portfolio!

## 🤝 Credits

Built by Sudarshan Tiwari
- GitHub: [ttsudarshan](https://github.com/ttsudarshan)
- LinkedIn: [ttsudarshan](https://linkedin.com/in/ttsudarshan)
