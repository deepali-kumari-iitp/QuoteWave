// main.js — QuoteWave (robust fallback + features)
const quoteEl = document.getElementById('quote');
const authorEl = document.getElementById('author');
const loader = document.getElementById('loader');
const statusEl = document.getElementById('status');

const newQuoteBtn = document.getElementById('newQuoteBtn');
const copyBtn = document.getElementById('copyBtn');
const speakBtn = document.getElementById('speakBtn');
const saveBtn = document.getElementById('saveBtn');
const tweetBtn = document.getElementById('tweetBtn');
const whatsappBtn = document.getElementById('whatsappBtn');

const tagRow = document.getElementById('tagRow');
let currentTag = ''; // empty => any
let isSpeaking = false;

// saved modal
const savedModal = document.getElementById('savedModal');
const viewSavedBtn = document.getElementById('viewSavedBtn');
const savedList = document.getElementById('savedList');
const closeSavedBtn = document.getElementById('closeSavedBtn');
const clearSavedBtn = document.getElementById('clearSavedBtn');

// theme
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Local storage keys
const SAVED_KEY = 'qw_favQuotes';
const COUNT_KEY = 'qw_quoteCount';

// Local quotes backup (so app NEVER fails)
const localQuotes = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", tags: ["inspirational","famous-quotes","life"] },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon", tags: ["life","famous-quotes"] },
  { text: "The best way to predict the future is to invent it.", author: "Alan Kay", tags: ["inspirational","technology"] },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson", tags: ["motivational","inspirational"] },
  { text: "Spread love everywhere you go.", author: "Mother Teresa", tags: ["love","inspirational"] },
  { text: "If you want to lift yourself up, lift up someone else.", author: "Booker T. Washington", tags: ["inspirational","friendship"] },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau", tags: ["life","famous-quotes"] },
  { text: "Any sufficiently advanced technology is indistinguishable from magic.", author: "Arthur C. Clarke", tags: ["technology","wisdom"] },
  { text: "You miss 100% of the shots you don’t take.", author: "Wayne Gretzky", tags: ["motivational","famous-quotes"] },
  { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde", tags: ["inspirational","famous-quotes"] },
  // add more if you like...
];

// Helpers
function showLoading(show = true) {
  if (show) {
    loader.classList.add('show');
    quoteEl.classList.remove('show');
    authorEl.classList.remove('show');
    statusEl.textContent = 'Loading...';
  } else {
    loader.classList.remove('show');
    statusEl.textContent = '';
  }
}
function showQuoteText() {
  quoteEl.classList.remove('show');
  authorEl.classList.remove('show');
  void quoteEl.offsetWidth;
  quoteEl.classList.add('show');
  authorEl.classList.add('show');
}

// Try Quotable -> ZenQuotes -> Local
async function fetchQuoteFromQuotable(tag = '') {
  let url = 'https://api.quotable.io/random';
  if (tag) url += `?tags=${encodeURIComponent(tag)}`;
  const resp = await fetchWithTimeout(url, 7000);
  if (!resp.ok) throw new Error('Quotable fetch failed');
  const data = await resp.json();
  // quotable returns content directly
  if (data && data.content) return { text: data.content, author: data.author || 'Unknown' };
  throw new Error('Quotable returned no content');
}

async function fetchQuoteFromZen() {
  // ZenQuotes returns an array [ { q, a } ]
  const url = 'https://zenquotes.io/api/random';
  const resp = await fetchWithTimeout(url, 7000);
  if (!resp.ok) throw new Error('ZenQuotes fetch failed');
  const data = await resp.json();
  if (Array.isArray(data) && data[0] && data[0].q) return { text: data[0].q, author: data[0].a || 'Unknown' };
  throw new Error('Zen returned no content');
}

function pickFromLocal(tag = '') {
  let pool = localQuotes;
  if (tag) {
    pool = localQuotes.filter(q => (q.tags || []).includes(tag));
    if (pool.length === 0) {
      // fallback to fuzzy tag matching
      pool = localQuotes.filter(q => (q.tags || []).some(t => t.includes(tag) || tag.includes(t)));
    }
  }
  if (!pool || pool.length === 0) pool = localQuotes;
  return pool[Math.floor(Math.random() * pool.length)];
}

// generic fetch with timeout
async function fetchWithTimeout(url, ms = 7000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const resp = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(id);
    return resp;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Main: tries sources in order and always returns a quote object
async function getQuote(tag = '') {
  // Prefer Quotable when tag is specified (it supports tags)
  try {
    // If tag is present, try Quotable first (tag support)
    if (tag) {
      try {
        const q = await fetchQuoteFromQuotable(tag);
        if (q && q.text) return q;
      } catch (e) {
        // continue to next source
        console.warn('Quotable with tag failed:', e.message);
      }
    } else {
      // no tag: try Quotable general
      try {
        const q = await fetchQuoteFromQuotable('');
        if (q && q.text) return q;
      } catch (e) {
        console.warn('Quotable general failed:', e.message);
      }
    }

    // Try ZenQuotes (no tag support)
    try {
      const q2 = await fetchQuoteFromZen();
      if (q2 && q2.text) return q2;
    } catch (e) {
      console.warn('ZenQuotes failed:', e.message);
    }

    // Fallback local
    const local = pickFromLocal(tag);
    return { text: local.text, author: local.author || 'Unknown' };
  } catch (finalErr) {
    // final fallback - pick local
    const local = pickFromLocal(tag);
    return { text: local.text, author: local.author || 'Unknown' };
  }
}

// Load and display
async function loadQuote(tag = '') {
  showLoading(true);
  try {
    const q = await getQuote(tag);
    quoteEl.textContent = q.text;
    authorEl.textContent = `— ${q.author}`;
    showQuoteText();

    // increment counter
    const cnt = Number(localStorage.getItem(COUNT_KEY) || 0) + 1;
    localStorage.setItem(COUNT_KEY, cnt);
    statusEl.textContent = '';
  } catch (err) {
    quoteEl.textContent = 'Could not load quote. Please try again.';
    authorEl.textContent = '';
    statusEl.textContent = 'Error — using local backup.';
  } finally {
    showLoading(false);
  }
}

// EVENTS
newQuoteBtn.addEventListener('click', () => loadQuote(currentTag));

// tag selection
tagRow.addEventListener('click', (e) => {
  const btn = e.target.closest('.tag');
  if (!btn) return;
  Array.from(tagRow.querySelectorAll('.tag')).forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  currentTag = btn.dataset.tag || '';
  loadQuote(currentTag);
});

// Copy
copyBtn.addEventListener('click', async () => {
  const text = `${quoteEl.textContent} ${authorEl.textContent}`;
  try {
    await navigator.clipboard.writeText(text);
    statusEl.textContent = 'Copied to clipboard!';
    setTimeout(()=> statusEl.textContent = '', 2000);
  } catch {
    statusEl.textContent = 'Could not copy (permission denied).';
  }
});

// Speak
speakBtn.addEventListener('click', () => {
  if (!('speechSynthesis' in window)) {
    statusEl.textContent = 'Speech synthesis not supported';
    return;
  }

  if (isSpeaking) {
    speechSynthesis.cancel();
    isSpeaking = false;
    speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Read';
    return;
  }

  const text = `${quoteEl.textContent} — ${authorEl.textContent}`;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.onend = () => {
    isSpeaking = false;
    speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Read';
  };
  isSpeaking = true;
  speakBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i> Stop';
  speechSynthesis.speak(utter);
});

// Tweet
tweetBtn.addEventListener('click', () => {
  const txt = encodeURIComponent(`${quoteEl.textContent} ${authorEl.textContent}`);
  const url = `https://twitter.com/intent/tweet?text=${txt}`;
  window.open(url, '_blank', 'width=600,height=400');
});

// WhatsApp
whatsappBtn.addEventListener('click', () => {
  const txt = encodeURIComponent(`${quoteEl.textContent} ${authorEl.textContent}`);
  const url = `https://api.whatsapp.com/send?text=${txt}`;
  window.open(url, '_blank');
});

// Save favorite
saveBtn.addEventListener('click', () => {
  const text = quoteEl.textContent.trim();
  const author = authorEl.textContent.replace('—','').trim();
  if (!text) return;

  const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
  if (saved.some(s => s.text === text)) {
    statusEl.textContent = 'Already saved';
    setTimeout(()=> statusEl.textContent = '', 1500);
    return;
  }

  saved.unshift({ text, author, savedAt: new Date().toISOString() });
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  statusEl.textContent = 'Saved to favorites';
  setTimeout(()=> statusEl.textContent = '', 1500);
});

// Saved modal controls
viewSavedBtn.addEventListener('click', openSavedModal);
closeSavedBtn.addEventListener('click', closeSavedModal);
clearSavedBtn.addEventListener('click', () => {
  if (!confirm('Clear all saved quotes?')) return;
  localStorage.removeItem(SAVED_KEY);
  populateSaved();
});

function openSavedModal(){
  savedModal.setAttribute('aria-hidden','false');
  populateSaved();
}
function closeSavedModal(){
  savedModal.setAttribute('aria-hidden','true');
}

function populateSaved(){
  const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
  savedList.innerHTML = '';
  if (saved.length === 0) {
    savedList.innerHTML = '<p class="small">No saved quotes yet. Save quotes with the "Save" button.</p>';
    return;
  }

  saved.forEach((s, idx) => {
    const item = document.createElement('div');
    item.className = 'saved-item';
    item.innerHTML = `
      <div>${s.text}</div>
      <div class="row">
        <div class="small">— ${s.author}</div>
        <div style="display:flex;gap:8px">
          <button class="btn small" data-action="use" data-index="${idx}">Use</button>
          <button class="btn small outline" data-action="copy" data-index="${idx}"><i class="fa-regular fa-copy"></i></button>
          <button class="btn small danger" data-action="del" data-index="${idx}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `;
    savedList.appendChild(item);
  });
}

savedList.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const idx = Number(btn.dataset.index);
  const action = btn.dataset.action;
  const saved = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');

  if (action === 'use') {
    const chosen = saved[idx];
    quoteEl.textContent = chosen.text;
    authorEl.textContent = `— ${chosen.author}`;
    closeSavedModal();
    showQuoteText();
  } else if (action === 'copy') {
    navigator.clipboard.writeText(`${saved[idx].text} — ${saved[idx].author}`);
  } else if (action === 'del') {
    if (!confirm('Delete this saved quote?')) return;
    saved.splice(idx,1);
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    populateSaved();
  }
});

// Theme toggle
themeToggle.addEventListener('click', () => {
  body.classList.toggle('dark');
  const icon = themeToggle.querySelector('i');
  if (body.classList.contains('dark')) {
    icon.className = 'fa-regular fa-sun';
  } else {
    icon.className = 'fa-regular fa-moon';
  }
  localStorage.setItem('qw_themeDark', body.classList.contains('dark') ? '1' : '0');
});

// keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'n') newQuoteBtn.click();
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    saveBtn.click();
  }
});

// Initial load
window.addEventListener('load', () => {
  const savedTheme = localStorage.getItem('qw_themeDark');
  if (savedTheme === '1') {
    body.classList.add('dark');
    themeToggle.querySelector('i').className = 'fa-regular fa-sun';
  }
  loadQuote();

  // persist theme change already handled in toggle event
});
