# Trello Big Tasks - macOS Desktop App

A lightweight, elegant macOS desktop app for viewing Trello cards from any list on any board. Built with Electron.

![macOS App](https://img.shields.io/badge/platform-macOS-lightgrey)
![Electron](https://img.shields.io/badge/Electron-28.0.0-blue)

---

> **📝 A Note from the Creator**
>
> This is a simple app I created to solve a particular problem I have. I want to see my long-running and important tasks on my screen at all times. I hope this will help me keep them top-of-mind. I keep these tasks in a particular list in my personal todo Trello board. This is why this app pulls in cards from a single list. I developed it entirely using Claude Code and have never looked at the code. I also created this app to learn how Claude Code works. Everything below this text was created by Claude Code and is what it thinks you need to know about the app(!)

---

## Features

- 📋 **View any Trello list** - Select from any board and list in your Trello account
- 🔄 **Auto-refresh** - Automatically checks for changes every 30 seconds without disrupting your workflow
- 🎨 **Clean, minimal interface** - Focus on your tasks with a beautiful gradient design
- 🖱️ **Draggable window** - Move the app anywhere on your screen
- 🚀 **Quick access** - Click any card to open it in your browser
- 🔒 **Secure** - Credentials stored locally, never shared
- 📱 **Responsive** - Adapts to narrow windows
- 👁️ **Smart filtering** - Automatically hides cards with covers

## Screenshots

The app features:
- Compact header with list and board names
- Simple emoji icon buttons for actions
- Card titles in clean, readable cards
- Smooth, flash-free updates when cards change

## Prerequisites

- macOS (tested on macOS 10.15+)
- Node.js (v14 or higher)
- npm or yarn
- A Trello account

## Installation

1. **Clone or download this repository**

```bash
cd /Users/paul/dev/trello-big-tasks-app
```

2. **Install dependencies**

```bash
npm install
```

## Getting Trello API Credentials

Before running the app, you'll need Trello API credentials:

1. **Get your API Key:**
   - Visit: https://trello.com/1/appKey/generate
   - Copy your API Key

2. **Generate a Token:**
   - On the same page, click the "Token" link
   - Authorize the app
   - Copy the token that appears

Keep these credentials handy - you'll enter them the first time you run the app.

## Running the App

**Development mode:**

```bash
npm start
```

The app will launch and prompt you to enter your Trello credentials.

## Using the App

### First Time Setup

1. **Enter Credentials:**
   - Paste your API Key
   - Paste your API Token
   - Click "Connect to Trello"

2. **Select Board & List:**
   - Choose a board from the dropdown
   - Choose a list from that board
   - Click "View Cards"

3. **Your cards will appear!**

### Daily Use

- **View cards:** All cards from your selected list appear as simple cards
- **Open in Trello:** Click any card to open it in your browser
- **Refresh manually:** Click the 🔄 button
- **Change board/list:** Click the 📋 button
- **Reset credentials:** Click the 🔑 button
- **Move the window:** Drag from the header area

### Auto-Refresh

The app automatically checks for changes every 30 seconds:
- Updates happen smoothly without flashing
- Preserves your scroll position
- Pauses when the window is hidden
- Resumes when you bring the window back

## Features in Detail

### Smart Card Filtering

Cards with covers (images or colors) are automatically hidden from the list. This helps you focus on text-based tasks.

### Responsive Design

The app adapts to narrow windows:
- Text sizes scale down at 600px width
- Further optimization at 400px width
- Buttons remain accessible at all sizes

### Security & Privacy

- API credentials stored in browser localStorage
- All API calls made through Electron's main process
- No data sent to third-party servers
- Credentials never logged or shared

## Project Structure

```
trello-big-tasks-app/
├── main.js          # Electron main process
├── preload.js       # Preload script for IPC
├── renderer.js      # Frontend logic & Trello API
├── index.html       # App structure
├── styles.css       # Styling & responsive design
├── package.json     # Dependencies & scripts
└── README.md        # This file
```

## Building for Distribution

To package the app for macOS:

1. Install electron-builder:

```bash
npm install --save-dev electron-builder
```

2. Add to package.json:

```json
"build": {
  "appId": "com.trello.bigtasks",
  "mac": {
    "category": "public.app-category.productivity"
  }
}
```

3. Build:

```bash
npx electron-builder --mac
```

The built app will be in the `dist/` folder.

## Troubleshooting

### "Failed to fetch boards"
- Verify your API Key and Token are correct
- Visit https://trello.com/1/appKey/generate to regenerate credentials
- Click 🔑 to reset and re-enter credentials

### App won't start
- Ensure all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be v14+)

### Cards not showing
- Ensure you've selected both a board AND a list
- Check that the list contains cards without covers
- Try manually refreshing with the 🔄 button

### Auto-refresh not working
- Check your internet connection
- Verify the app window is visible (polling pauses when hidden)
- Look for the refresh icon dimming briefly every 30 seconds

## Technology Stack

- **Electron** - Desktop app framework
- **Node.js** - Runtime
- **Trello REST API** - Data source
- **Vanilla JavaScript** - No frameworks needed
- **CSS3** - Modern styling with gradients and flexbox

## Contributing

This is a personal project, but suggestions are welcome!

## License

MIT

## Author

Built with Claude Code
