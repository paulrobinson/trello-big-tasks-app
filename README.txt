TRELLO BIG TASKS - macOS Desktop App
=====================================

A beautiful macOS desktop app to view all your Trello cards from the "Big Tasks" list.

SETUP INSTRUCTIONS:
-------------------

1. Get your Trello API credentials:
   - Visit: https://trello.com/app-key
   - Copy your API Key
   - Click the "Token" link on that page to generate a token
   - Copy the token

2. Run the app:
   - Open Terminal
   - Navigate to this folder: cd /Users/paul/dev/trello-big-tasks-app
   - Run: npm start

3. On first launch:
   - Enter your API Key and Token in the setup screen
   - Click "Connect"
   - Your credentials will be saved for future use

FEATURES:
---------
- Displays all cards from your "Big Tasks" list
- Shows card names, descriptions, labels, and due dates
- Highlights overdue tasks in red
- Shows assigned members with avatars
- Click any card to open it in your browser
- Click "Refresh" to reload the cards
- Beautiful macOS-native design with gradient background

TROUBLESHOOTING:
----------------
- If you don't see any cards, make sure you have a list named exactly "Big Tasks" in one of your Trello boards
- If you get an authentication error, verify your API Key and Token are correct
- The app searches across all your boards to find the "Big Tasks" list

RUNNING THE APP:
----------------
From the project directory, run:
    npm start

To quit the app, use Cmd+Q or close the window.
