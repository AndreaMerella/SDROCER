import { startCapture } from './audio.js';
import { identify } from './shazam.js';
import { search as discogsSearch, enrich } from './discogs.js';
import {
  getCollection, addRecord, updateStatus, removeRecord, filterCollection
} from './collection.js';
import {
  setStatus, showVisualizer, hideVisualizer, setListenBtn,
  showResult, hideResult, showDiscogsResults, hideDiscogsResults,
  renderCollection, renderCrate
} from './ui.js';

// ── State ──────────────────────────────────────────────────────
let vizFrameId = null;
let isScanning = false;
let currentView = 'scan';
let currentFilter = 'all';
let currentRecord = null;

// ── Boot ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderCrate(getCollection());
  bindEvents();
});

// ── Events ─────────────────────────────────────────────────────
function bindEvents() {
  document.getElementById('btn-listen').addEventListener('click', onListen);

  // View toggle
  document.getElementById('btn-view-scan').addEventListener('click', () => switchView('scan'));
  document.getElementById('btn-view-collection').addEventListener('click', () => switchView('collection'));

  // Discogs search bar
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('btn-search');

  searchBtn.addEventListener('click', () => onDiscogsSearch(searchInput.value));
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') onDiscogsSearch(searchInput.value);
    if (e.key === 'Escape') hideDiscogsResults();
  });

  // Collection filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refreshCollection();
    });
  });

  // Close discogs results on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('#discogs-results') && !e.target.closest('#btn-search') && !e.target.closest('#search-input')) {
      hideDiscogsResults();
    }
  });
}

// ── View switch ────────────────────────────────────────────────
function switchView(view) {
  currentView = view;
  const scanEl = document.getElementById('view-scan');
  const collEl = document.getElementById('view-collection');

  document.getElementById('btn-view-scan').classList.toggle('active', view === 'scan');
  document.getElementById('btn-view-collection').classList.toggle('active', view === 'collection');

  scanEl.classList.toggle('active', view === 'scan');
  collEl.classList.toggle('active', view === 'collection');

  if (view === 'collection') refreshCollection();
}

// ── Scan ───────────────────────────────────────────────────────
async function onListen() {
  if (isScanning) return;
  isScanning = true;

  hideResult();
  setListenBtn('listening');
  setStatus('ACCESSING MIC...');

  try {
    const base64Audio = await startCapture((analyser) => {
      vizFrameId = showVisualizer(analyser);
      setStatus('LISTENING — 5s');
    });

    hideVisualizer(vizFrameId);
    setListenBtn('processing');
    setStatus('QUERYING SHAZAM...');

    const track = await identify(base64Audio);

    if (!track) {
      setStatus('NO MATCH — TRY DISCOGS SEARCH BELOW', 'error');
      setListenBtn('idle');
      isScanning = false;
      return;
    }

    setStatus('ENRICHING METADATA...');
    const discogsData = await enrich(track.title, track.artist).catch(() => null);

    const merged = {
      ...track,
      artwork: discogsData?.artwork || track.artwork,
      label: discogsData?.label || track.label,
      year: discogsData?.year || track.year,
      genre: discogsData?.genre || track.genre,
      style: discogsData?.style || null,
      discogsId: discogsData?.discogsId || null,
      discogsUrl: discogsData?.discogsUrl || null,
    };

    currentRecord = addRecord(merged);
    setStatus('TRACK SECURED', 'success');
    setListenBtn('idle');

    showResult(currentRecord, (status) => {
      updateStatus(currentRecord.id, status);
      currentRecord.status = status;
      renderCrate(getCollection());
    });

    renderCrate(getCollection());

  } catch (err) {
    hideVisualizer(vizFrameId);
    setListenBtn('idle');

    if (err.name === 'NotAllowedError') {
      setStatus('MIC DENIED — ALLOW ACCESS IN BROWSER SETTINGS', 'error');
    } else if (err.message.includes('fetch')) {
      setStatus('NETWORK ERROR — CHECK CONNECTION', 'error');
    } else {
      setStatus(`ERROR: ${err.message}`, 'error');
    }
  }

  isScanning = false;
}

// ── Discogs search ─────────────────────────────────────────────
async function onDiscogsSearch(query) {
  if (!query.trim()) return;
  setStatus('SEARCHING DISCOGS...');

  try {
    const results = await discogsSearch(query);

    if (!results.length) {
      setStatus('NO RESULTS ON DISCOGS', 'error');
      return;
    }

    setStatus('SELECT A RELEASE');
    showDiscogsResults(results, (selected) => {
      const record = addRecord({
        title: selected.title.includes(' - ')
          ? selected.title.split(' - ')[1]?.trim()
          : selected.title,
        artist: selected.title.includes(' - ')
          ? selected.title.split(' - ')[0]?.trim()
          : '',
        artwork: selected.artwork,
        label: selected.label,
        year: selected.year,
        genre: selected.genre,
        style: selected.style,
        bpm: null,
        discogsId: selected.discogsId,
        discogsUrl: selected.discogsUrl
      });

      currentRecord = record;
      setStatus('ADDED TO CRATE', 'success');

      showResult(currentRecord, (status) => {
        updateStatus(currentRecord.id, status);
        currentRecord.status = status;
        renderCrate(getCollection());
      });

      renderCrate(getCollection());
    });
  } catch (err) {
    setStatus('DISCOGS SEARCH FAILED', 'error');
  }
}

// ── Collection ─────────────────────────────────────────────────
function refreshCollection() {
  const records = filterCollection({ status: currentFilter });
  renderCollection(
    records,
    (id, status) => {
      updateStatus(id, status);
      renderCrate(getCollection());
      refreshCollection();
    },
    (id) => {
      removeRecord(id);
      renderCrate(getCollection());
      refreshCollection();
    }
  );
}
