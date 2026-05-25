// UI module — all DOM updates live here

export function setStatus(text, type = '') {
  const el = document.getElementById('status-line');
  el.textContent = text;
  el.className = 'status-line' + (type ? ` ${type}` : '');
}

export function showVisualizer(analyser) {
  const wrap = document.getElementById('vis-wrap');
  const canvas = document.getElementById('visualizer');
  const ctx = canvas.getContext('2d');

  wrap.classList.add('active');
  canvas.width = wrap.offsetWidth;
  canvas.height = wrap.offsetHeight;

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  let frameId;

  function draw() {
    frameId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const barW = (canvas.width / bufferLength) * 1.4;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const h = dataArray[i] / 2;
      ctx.fillStyle = `rgb(${Math.min(255, 100 + h)}, ${Math.max(0, 100 - h / 3)}, 255)`;
      ctx.fillRect(x, canvas.height - h, barW, h);
      x += barW + 2;
    }
  }

  draw();
  return frameId;
}

export function hideVisualizer(frameId) {
  cancelAnimationFrame(frameId);
  document.getElementById('vis-wrap').classList.remove('active');
}

export function setListenBtn(state) {
  const btn = document.getElementById('btn-listen');
  btn.className = 'btn-listen';
  const labels = { idle: 'LISTEN', listening: 'REC', processing: '...' };
  btn.textContent = labels[state] || 'LISTEN';
  if (state === 'listening') btn.classList.add('listening');
  if (state === 'processing') btn.classList.add('processing');
}

export function showResult(record, onStatusChange) {
  const card = document.getElementById('result-card');

  // Artwork
  const artEl = document.getElementById('result-artwork');
  const artPlaceholder = document.getElementById('result-artwork-placeholder');
  if (record.artwork) {
    artEl.src = record.artwork;
    artEl.style.display = 'block';
    artPlaceholder.style.display = 'none';
  } else {
    artEl.style.display = 'none';
    artPlaceholder.style.display = 'flex';
  }

  document.getElementById('result-title').textContent = record.title;
  document.getElementById('result-artist').textContent = record.artist;
  document.getElementById('result-label').textContent = record.label || '—';
  document.getElementById('result-year').textContent = record.year || '—';
  document.getElementById('result-bpm').textContent = record.bpm || '—';

  // Status buttons
  const btns = card.querySelectorAll('.btn-status');
  function refreshBtns(status) {
    btns.forEach(b => {
      b.classList.remove('owned', 'want', 'heard');
      if (b.dataset.status === status) b.classList.add(status);
    });
  }
  refreshBtns(record.status);

  btns.forEach(btn => {
    btn.onclick = () => {
      onStatusChange(btn.dataset.status);
      refreshBtns(btn.dataset.status);
    };
  });

  card.classList.add('visible');
}

export function hideResult() {
  document.getElementById('result-card').classList.remove('visible');
}

export function showDiscogsResults(results, onSelect) {
  const list = document.getElementById('discogs-results');
  list.innerHTML = '';

  if (!results.length) {
    list.classList.remove('visible');
    return;
  }

  results.forEach(r => {
    const item = document.createElement('div');
    item.className = 'discogs-result-item';

    const imgHtml = r.artwork
      ? `<img class="discogs-thumb" src="${r.artwork}" alt="" loading="lazy">`
      : `<div class="discogs-thumb-placeholder">♪</div>`;

    const sub = [r.label, r.year, r.format].filter(Boolean).join(' · ');

    item.innerHTML = `
      ${imgHtml}
      <div class="discogs-item-info">
        <div class="discogs-item-title">${r.title}</div>
        <div class="discogs-item-sub">${sub}</div>
      </div>`;

    item.addEventListener('click', () => {
      list.classList.remove('visible');
      onSelect(r);
    });

    list.appendChild(item);
  });

  list.classList.add('visible');
}

export function hideDiscogsResults() {
  document.getElementById('discogs-results').classList.remove('visible');
}

export function renderCollection(records, onStatusChange, onRemove) {
  const list = document.getElementById('collection-list');
  const countEl = document.getElementById('collection-count');
  countEl.textContent = `${records.length} RECORDS`;

  if (!records.length) {
    list.innerHTML = `
      <div class="collection-empty">
        <div>CRATE IS EMPTY</div>
        <div style="color:#333">SCAN OR SEARCH TO ADD RECORDS</div>
      </div>`;
    return;
  }

  list.innerHTML = records.map(r => {
    const artHtml = r.artwork
      ? `<img class="collection-art" src="${r.artwork}" alt="" loading="lazy">`
      : `<div class="collection-art-placeholder">♪</div>`;

    const sub = [r.label, r.year].filter(Boolean).join(' · ');

    const discogsHref = r.discogsUrl || `https://www.discogs.com/search/?q=${encodeURIComponent(r.artist + ' ' + r.title)}&type=release`;

    return `
      <div class="collection-record">
        ${artHtml}
        <div class="collection-info">
          <div class="collection-title">${r.title}</div>
          <div class="collection-artist">${r.artist}</div>
          ${sub ? `<div class="collection-sub">${sub}</div>` : ''}
        </div>
        <div class="collection-right">
          <span class="status-badge ${r.status}">${r.status.toUpperCase()}</span>
          <a class="btn-discogs" href="${discogsHref}" target="_blank" rel="noopener" title="View on Discogs">D</a>
          <button class="btn-remove" data-id="${r.id}" title="Remove">✕</button>
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('.collection-record').forEach((el, i) => {
    const record = records[i];
    el.querySelector('.status-badge').addEventListener('click', (e) => {
      e.stopPropagation();
      const next = { owned: 'want', want: 'heard', heard: 'owned' };
      onStatusChange(record.id, next[record.status]);
    });
  });

  list.querySelectorAll('.btn-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onRemove(parseInt(btn.dataset.id));
    });
  });
}

export function renderCrate(records) {
  const tray = document.getElementById('crate-tray');

  if (!records.length) {
    tray.innerHTML = `<div class="crate-empty">CRATE EMPTY</div>`;
    return;
  }

  tray.innerHTML = records.map(r => {
    const artHtml = r.artwork
      ? `<img class="crate-item-art" src="${r.artwork}" alt="" loading="lazy">`
      : `<div class="crate-item-art-placeholder">♪</div>`;

    const discogsHref = r.discogsUrl || `https://www.discogs.com/search/?q=${encodeURIComponent(r.artist + ' ' + r.title)}&type=release`;

    return `
      <div class="crate-item" data-discogs="${discogsHref}">
        ${artHtml}
        <div class="crate-status-dot ${r.status}"></div>
        <div class="crate-item-label">
          <div class="crate-item-title">${r.title}</div>
          <div class="crate-item-artist">${r.artist}</div>
        </div>
      </div>`;
  }).join('');

  tray.querySelectorAll('.crate-item').forEach(el => {
    el.addEventListener('click', () => {
      window.open(el.dataset.discogs, '_blank', 'noopener');
    });
  });
}
