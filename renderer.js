// Store credentials in localStorage
let apiKey = localStorage.getItem('trelloApiKey') || '';
let apiToken = localStorage.getItem('trelloApiToken') || '';
let selectedBoardId = localStorage.getItem('selectedBoardId') || '';
let selectedListId = localStorage.getItem('selectedListId') || '';

const setupPanel = document.getElementById('setupPanel');
const loadingPanel = document.getElementById('loadingPanel');
const boardSelectorPanel = document.getElementById('boardSelectorPanel');
const cardsPanel = document.getElementById('cardsPanel');
const errorPanel = document.getElementById('errorPanel');
const cardsList = document.getElementById('cardsList');
const errorMessage = document.getElementById('errorMessage');

const apiKeyInput = document.getElementById('apiKey');
const apiTokenInput = document.getElementById('apiToken');
const connectBtn = document.getElementById('connectBtn');
const refreshBtn = document.getElementById('refreshBtn');
const retryBtn = document.getElementById('retryBtn');
const resetBtn = document.getElementById('resetBtn');
const resetFromErrorBtn = document.getElementById('resetFromErrorBtn');
const apiKeyLink = document.getElementById('apiKeyLink');
const boardSelect = document.getElementById('boardSelect');
const listSelect = document.getElementById('listSelect');
const viewCardsBtn = document.getElementById('viewCardsBtn');
const changeBoardBtn = document.getElementById('changeBoardBtn');
const currentListName = document.getElementById('currentListName');
const currentBoardName = document.getElementById('currentBoardName');

let allBoards = [];
let currentBoard = null;
let currentList = null;

// Auto-refresh state
let pollInterval = null;
let lastCardCount = 0;
let lastChecksum = '';
const POLL_INTERVAL_MS = 30000; // Check every 30 seconds

// Initialize
if (apiKey && apiToken) {
  apiKeyInput.value = apiKey;
  apiTokenInput.value = apiToken;
  if (selectedBoardId && selectedListId) {
    loadCards();
  } else {
    showBoardSelector();
  }
} else {
  showPanel('setup');
}

// Handle link clicks
apiKeyLink.addEventListener('click', (e) => {
  e.preventDefault();
  window.electronAPI.openExternal('https://trello.com/1/appKey/generate');
});

// Event listeners
connectBtn.addEventListener('click', () => {
  apiKey = apiKeyInput.value.trim();
  apiToken = apiTokenInput.value.trim();

  if (!apiKey || !apiToken) {
    showError('Please enter both API Key and Token');
    return;
  }

  // Save credentials
  localStorage.setItem('trelloApiKey', apiKey);
  localStorage.setItem('trelloApiToken', apiToken);

  // Show board selector
  showBoardSelector();
});

refreshBtn.addEventListener('click', () => {
  loadCards(false);
});

retryBtn.addEventListener('click', () => {
  if (apiKey && apiToken) {
    loadCards(false);
  } else {
    showPanel('setup');
  }
});

resetBtn.addEventListener('click', resetCredentials);
resetFromErrorBtn.addEventListener('click', resetCredentials);
changeBoardBtn.addEventListener('click', () => {
  stopPolling();
  showBoardSelector();
});

boardSelect.addEventListener('change', async () => {
  const boardId = boardSelect.value;
  if (!boardId) return;

  selectedBoardId = boardId;
  localStorage.setItem('selectedBoardId', boardId);
  currentBoard = allBoards.find(b => b.id === boardId);

  // Load lists for selected board
  await loadLists(boardId);
});

listSelect.addEventListener('change', () => {
  selectedListId = listSelect.value;
  if (selectedListId) {
    localStorage.setItem('selectedListId', selectedListId);
  }
});

viewCardsBtn.addEventListener('click', () => {
  if (!selectedBoardId || !selectedListId) {
    showError('Please select both a board and a list');
    return;
  }
  loadCards(false);
});

function resetCredentials() {
  stopPolling();
  localStorage.removeItem('trelloApiKey');
  localStorage.removeItem('trelloApiToken');
  localStorage.removeItem('selectedBoardId');
  localStorage.removeItem('selectedListId');
  apiKey = '';
  apiToken = '';
  selectedBoardId = '';
  selectedListId = '';
  apiKeyInput.value = '';
  apiTokenInput.value = '';
  showPanel('setup');
}

// Functions
function showPanel(panel) {
  setupPanel.style.display = 'none';
  loadingPanel.style.display = 'none';
  boardSelectorPanel.style.display = 'none';
  cardsPanel.style.display = 'none';
  errorPanel.style.display = 'none';

  // Show/hide change board button and update header based on panel
  if (panel === 'cards') {
    changeBoardBtn.style.display = 'flex';
  } else {
    changeBoardBtn.style.display = 'none';
    // Clear header info when not showing cards
    currentListName.textContent = '';
    currentBoardName.textContent = '';
  }

  switch(panel) {
    case 'setup':
      setupPanel.style.display = 'block';
      break;
    case 'loading':
      loadingPanel.style.display = 'block';
      break;
    case 'boardSelector':
      boardSelectorPanel.style.display = 'block';
      break;
    case 'cards':
      cardsPanel.style.display = 'block';
      break;
    case 'error':
      errorPanel.style.display = 'block';
      break;
  }
}

function showError(message) {
  errorMessage.textContent = message;
  showPanel('error');
}

async function showBoardSelector() {
  showPanel('loading');
  document.querySelector('.loading-panel p').textContent = 'Loading your boards...';

  try {
    const boardsResponse = await window.electronAPI.trelloAPI(
      `https://api.trello.com/1/members/me/boards?key=${apiKey}&token=${apiToken}`
    );

    if (!boardsResponse.ok) {
      throw new Error('Failed to fetch boards. Please check your API credentials.');
    }

    allBoards = boardsResponse.data;

    // Populate board selector
    boardSelect.innerHTML = '<option value="">Select a board...</option>';
    allBoards.forEach(board => {
      const option = document.createElement('option');
      option.value = board.id;
      option.textContent = board.name;
      if (board.id === selectedBoardId) {
        option.selected = true;
      }
      boardSelect.appendChild(option);
    });

    // If there's a selected board, load its lists
    if (selectedBoardId) {
      await loadLists(selectedBoardId);
    }

    showPanel('boardSelector');

  } catch (error) {
    showError(error.message);
  }
}

async function loadLists(boardId) {
  try {
    const listsResponse = await window.electronAPI.trelloAPI(
      `https://api.trello.com/1/boards/${boardId}/lists?key=${apiKey}&token=${apiToken}`
    );

    if (!listsResponse.ok) {
      throw new Error('Failed to fetch lists.');
    }

    const lists = listsResponse.data;

    // Populate list selector
    listSelect.innerHTML = '<option value="">Select a list...</option>';
    lists.forEach(list => {
      const option = document.createElement('option');
      option.value = list.id;
      option.textContent = list.name;
      if (list.id === selectedListId) {
        option.selected = true;
      }
      listSelect.appendChild(option);
    });

  } catch (error) {
    showError(error.message);
  }
}

async function loadCards(silent = false) {
  if (!silent) {
    showPanel('loading');
    document.querySelector('.loading-panel p').textContent = 'Loading cards...';
  } else {
    // Show subtle indicator on refresh button
    refreshBtn.style.opacity = '0.5';
  }

  try {
    // Fetch cards from the selected list
    const cardsResponse = await window.electronAPI.trelloAPI(
      `https://api.trello.com/1/lists/${selectedListId}/cards?key=${apiKey}&token=${apiToken}&fields=name,cover&members=true&member_fields=fullName,avatarUrl`
    );

    if (!cardsResponse.ok) {
      throw new Error('Failed to fetch cards.');
    }

    const allCards = cardsResponse.data;

    // Filter out cards that have a cover
    const cards = allCards.filter(card => {
      // Check if card has a cover (cover.idAttachment exists or cover.color exists)
      return !card.cover || (!card.cover.idAttachment && !card.cover.color);
    });

    // Get list and board details if not silent or if not already loaded
    if (!silent || !currentList) {
      const listResponse = await window.electronAPI.trelloAPI(
        `https://api.trello.com/1/lists/${selectedListId}?key=${apiKey}&token=${apiToken}`
      );
      currentList = listResponse.data;
      currentBoard = allBoards.find(b => b.id === selectedBoardId);
    }

    displayCards(cards, silent);

    // Start polling for changes after first successful load
    if (!silent) {
      startPolling();
    }

  } catch (error) {
    if (!silent) {
      showError(error.message);
    }
  } finally {
    if (silent) {
      refreshBtn.style.opacity = '1';
    }
  }
}

function displayCards(cards, silent = false) {
  // Update header
  if (currentList) {
    currentListName.textContent = currentList.name;
  }
  if (currentBoard) {
    currentBoardName.textContent = currentBoard.name;
  }

  // Track changes for smart polling
  lastCardCount = cards.length;
  lastChecksum = generateChecksum(cards);

  // Save current scroll position for silent updates
  const scrollPos = silent ? cardsList.parentElement.scrollTop : 0;

  if (cards.length === 0) {
    cardsList.innerHTML = `
      <div class="empty-state">
        <h3>No cards found</h3>
        <p>This list is empty!</p>
      </div>
    `;
  } else {
    cardsList.innerHTML = cards.map(card => createCardHTML(card)).join('');

    // Add click handlers to open cards in browser
    document.querySelectorAll('.card').forEach((cardEl, index) => {
      cardEl.addEventListener('click', () => {
        const cardUrl = `https://trello.com/c/${cards[index].id}`;
        window.electronAPI.openExternal(cardUrl);
      });
    });
  }

  // Restore scroll position for silent updates
  if (silent) {
    cardsList.parentElement.scrollTop = scrollPos;
  }

  if (!silent) {
    showPanel('cards');
  }
}

function createCardHTML(card) {
  return `
    <div class="card">
      <div class="card-name">${escapeHTML(card.name)}</div>
    </div>
  `;
}

function formatDate(date) {
  const now = new Date();
  const diffDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `Overdue by ${Math.abs(diffDays)} days`;
  } else if (diffDays === 0) {
    return 'Due today';
  } else if (diffDays === 1) {
    return 'Due tomorrow';
  } else if (diffDays < 7) {
    return `Due in ${diffDays} days`;
  } else {
    return date.toLocaleDateString();
  }
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Auto-refresh functions
function generateChecksum(cards) {
  // Create a simple checksum from card IDs and names
  return cards.map(c => `${c.id}:${c.name}`).join('|');
}

async function checkForChanges() {
  if (!selectedListId || !apiKey || !apiToken) {
    return;
  }

  try {
    // Lightweight check - just get card IDs and names
    const response = await window.electronAPI.trelloAPI(
      `https://api.trello.com/1/lists/${selectedListId}/cards?key=${apiKey}&token=${apiToken}&fields=name,cover`
    );

    if (response.ok) {
      const allCards = response.data;

      // Filter out cards with covers
      const cards = allCards.filter(card => {
        return !card.cover || (!card.cover.idAttachment && !card.cover.color);
      });

      const newChecksum = generateChecksum(cards);
      const newCount = cards.length;

      // If count changed or checksum different, reload cards
      if (newCount !== lastCardCount || newChecksum !== lastChecksum) {
        await loadCards(true);
      }
    }
  } catch (error) {
    // Silently fail for background checks
    console.error('Background check failed:', error);
  }
}

function startPolling() {
  // Stop any existing polling
  stopPolling();

  // Start new polling interval
  pollInterval = setInterval(checkForChanges, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

// Stop polling when window is hidden, resume when visible
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopPolling();
  } else if (cardsPanel.style.display !== 'none') {
    startPolling();
  }
});
