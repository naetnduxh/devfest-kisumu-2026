/**
 * DevFest Kisumu 2026 - Speaker Schedules & Agendas App
 * Frontend Application Logic
 */

// Application State
const state = {
  event: null,
  agendas: [],
  speakers: [],
  tracks: [],
  stages: [],
  activeTab: 'schedule',
  selectedTrack: 'all',
  selectedStage: 'all',
  selectedLevel: 'all',
  searchQuery: '',
  bookmarkedIds: new Set(JSON.parse(localStorage.getItem('devfest_kisumu_bookmarks') || '[]')),
  activeModalSession: null
};

// DOM Elements
const elements = {
  // Theme
  themeToggleBtn: document.getElementById('themeToggleBtn'),
  themeIcon: document.getElementById('themeIcon'),
  
  // Hero
  heroTagline: document.getElementById('heroTagline'),
  heroSubtitle: document.getElementById('heroSubtitle'),
  heroDate: document.getElementById('heroDate'),
  heroTime: document.getElementById('heroTime'),
  heroVenue: document.getElementById('heroVenue'),
  statSessions: document.getElementById('statSessions'),
  statSpeakers: document.getElementById('statSpeakers'),
  statTracks: document.getElementById('statTracks'),
  statStages: document.getElementById('statStages'),
  statAttendees: document.getElementById('statAttendees'),
  
  // Navigation Tabs
  navTabs: document.querySelectorAll('.nav-tab-btn, .mobile-nav-btn'),
  scheduleView: document.getElementById('scheduleView'),
  speakersView: document.getElementById('speakersView'),
  bookmarksView: document.getElementById('bookmarksView'),
  bookmarkCountNav: document.getElementById('bookmarkCountNav'),
  bookmarkCountMobile: document.getElementById('bookmarkCountMobile'),
  
  // Filters
  searchInput: document.getElementById('searchInput'),
  stageFilterSelect: document.getElementById('stageFilterSelect'),
  levelFilterSelect: document.getElementById('levelFilterSelect'),
  trackPillsContainer: document.getElementById('trackPillsContainer'),
  allTracksCount: document.getElementById('allTracksCount'),
  
  // Views containers
  scheduleTimeline: document.getElementById('scheduleTimeline'),
  scheduleCountText: document.getElementById('scheduleCountText'),
  speakersGrid: document.getElementById('speakersGrid'),
  speakersCountText: document.getElementById('speakersCountText'),
  bookmarksTimeline: document.getElementById('bookmarksTimeline'),
  exportIcalBtn: document.getElementById('exportIcalBtn'),
  clearBookmarksBtn: document.getElementById('clearBookmarksBtn'),
  
  // Modal
  modalOverlay: document.getElementById('sessionModalOverlay'),
  modalCloseBtn: document.getElementById('modalCloseBtn'),
  modalTrackBadge: document.getElementById('modalTrackBadge'),
  modalTitle: document.getElementById('modalTitle'),
  modalTime: document.getElementById('modalTime'),
  modalStage: document.getElementById('modalStage'),
  modalLevel: document.getElementById('modalLevel'),
  modalType: document.getElementById('modalType'),
  modalDescription: document.getElementById('modalDescription'),
  modalPrerequisitesWrap: document.getElementById('modalPrerequisitesWrap'),
  modalPrerequisites: document.getElementById('modalPrerequisites'),
  modalSpeakersContainer: document.getElementById('modalSpeakersContainer'),
  modalTagsContainer: document.getElementById('modalTagsContainer'),
  modalBookmarkToggleBtn: document.getElementById('modalBookmarkToggleBtn'),
  modalDownloadIcsBtn: document.getElementById('modalDownloadIcsBtn'),
  
  // Toast
  toastContainer: document.getElementById('toastContainer')
};

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupEventListeners();
  await loadInitialData();
});

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('devfest_kisumu_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function updateThemeIcon(theme) {
  if (theme === 'dark') {
    elements.themeIcon.className = 'fa-solid fa-sun';
  } else {
    elements.themeIcon.className = 'fa-solid fa-moon';
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const target = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', target);
  localStorage.setItem('devfest_kisumu_theme', target);
  updateThemeIcon(target);
  showToast(`Switched to ${target} mode`);
}

// ==================== API DATA LOADING ====================

async function loadInitialData() {
  try {
    // 1. Fetch Event Info
    const eventRes = await fetch('/api/event');
    const eventJson = await eventRes.json();
    if (eventJson.success) {
      state.event = eventJson.event;
      state.tracks = eventJson.tracks;
      state.stages = eventJson.stages;
      populateEventDetails(eventJson.event);
      populateTrackPills(eventJson.tracks);
      populateStageDropdown(eventJson.stages);
    }

    // 2. Fetch All Agendas
    const agendasRes = await fetch('/api/agendas');
    const agendasJson = await agendasRes.json();
    if (agendasJson.success) {
      state.agendas = agendasJson.agendas;
    }

    // 3. Fetch All Speakers
    const speakersRes = await fetch('/api/speakers');
    const speakersJson = await speakersRes.json();
    if (speakersJson.success) {
      state.speakers = speakersJson.speakers;
    }

    // 4. Update UI counts and render views
    updateBookmarkBadges();
    renderSchedule();
    renderSpeakers();
    renderBookmarks();

  } catch (error) {
    console.error('Failed to load conference data:', error);
    showToast('Failed to connect to the DevFest API. Please verify server is running.', 'error');
  }
}

// Populate Hero and Meta Information
function populateEventDetails(event) {
  if (!event) return;
  if (elements.heroTagline) elements.heroTagline.textContent = `${event.name} • ${event.edition}`;
  if (elements.heroSubtitle) elements.heroSubtitle.textContent = event.theme;
  if (elements.heroDate) elements.heroDate.textContent = event.date;
  if (elements.heroTime) elements.heroTime.textContent = event.time;
  if (elements.heroVenue) elements.heroVenue.textContent = `${event.venue.name}, ${event.venue.city}`;

  if (event.stats) {
    if (elements.statSessions) elements.statSessions.textContent = event.stats.totalSessions;
    if (elements.statSpeakers) elements.statSpeakers.textContent = event.stats.totalSpeakers;
    if (elements.statTracks) elements.statTracks.textContent = event.stats.tracksCount;
    if (elements.statStages) elements.statStages.textContent = event.stats.stagesCount;
    if (elements.statAttendees) elements.statAttendees.textContent = event.stats.expectedAttendees;
  }
}

function populateTrackPills(tracks) {
  if (!elements.trackPillsContainer) return;
  
  // Keep the 'All' pill, append track pills
  const allBtn = elements.trackPillsContainer.querySelector('[data-track="all"]');
  elements.trackPillsContainer.innerHTML = '';
  if (allBtn) elements.trackPillsContainer.appendChild(allBtn);

  tracks.forEach(track => {
    const btn = document.createElement('button');
    btn.className = 'track-pill-btn';
    btn.setAttribute('data-track', track.id);
    btn.innerHTML = `
      <span class="track-pill-indicator" style="background:${track.color};"></span>
      <span>${escapeHtml(track.name)}</span>
      <span class="pill-count" id="track-count-${track.id}"></span>
    `;
    btn.addEventListener('click', () => {
      setTrackFilter(track.id);
    });
    elements.trackPillsContainer.appendChild(btn);
  });
}

function populateStageDropdown(stages) {
  if (!elements.stageFilterSelect) return;
  stages.forEach(stage => {
    const option = document.createElement('option');
    option.value = stage.id;
    option.textContent = `${stage.name} (${stage.type})`;
    elements.stageFilterSelect.appendChild(option);
  });
}

// ==================== FILTERING & SEARCH ====================

function getFilteredAgendas() {
  let list = [...state.agendas];

  // Filter Track
  if (state.selectedTrack !== 'all') {
    list = list.filter(a => a.trackId === state.selectedTrack);
  }

  // Filter Stage
  if (state.selectedStage !== 'all') {
    list = list.filter(a => a.stageId === state.selectedStage);
  }

  // Filter Level
  if (state.selectedLevel !== 'all') {
    list = list.filter(a => a.level.toLowerCase() === state.selectedLevel.toLowerCase());
  }

  // Filter Keyword Search
  if (state.searchQuery.trim() !== '') {
    const q = state.searchQuery.trim().toLowerCase();
    list = list.filter(a => {
      const titleMatch = (a.title || '').toLowerCase().includes(q);
      const descMatch = (a.description || '').toLowerCase().includes(q);
      const tagsMatch = (a.tags || []).some(t => t.toLowerCase().includes(q));
      const spkMatch = (a.speakerProfiles || []).some(s =>
        (s.name || '').toLowerCase().includes(q) ||
        (s.organization || '').toLowerCase().includes(q) ||
        (s.role || '').toLowerCase().includes(q)
      );
      return titleMatch || descMatch || tagsMatch || spkMatch;
    });
  }

  return list;
}

function setTrackFilter(trackId) {
  state.selectedTrack = trackId;
  const buttons = elements.trackPillsContainer.querySelectorAll('.track-pill-btn');
  buttons.forEach(b => {
    if (b.getAttribute('data-track') === trackId) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  renderSchedule();
  if (state.activeTab === 'bookmarks') {
    renderBookmarks();
  }
}

// Update track pill counts
function updateTrackCounts() {
  if (!elements.allTracksCount) return;
  elements.allTracksCount.textContent = `(${state.agendas.length})`;

  state.tracks.forEach(t => {
    const el = document.getElementById(`track-count-${t.id}`);
    if (el) {
      const count = state.agendas.filter(a => a.trackId === t.id).length;
      el.textContent = `(${count})`;
    }
  });
}

// ==================== RENDERING: SCHEDULE TIMELINE ====================

function renderSchedule() {
  updateTrackCounts();
  const filtered = getFilteredAgendas();
  
  if (elements.scheduleCountText) {
    elements.scheduleCountText.textContent = `Showing ${filtered.length} of ${state.agendas.length} sessions`;
  }

  if (filtered.length === 0) {
    elements.scheduleTimeline.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-calendar-xmark empty-icon"></i>
        <h3 class="empty-title">No sessions match your filter</h3>
        <p class="empty-desc">Try clearing your search query or selecting a different track or stage.</p>
        <button class="btn-primary" onclick="resetFilters()">
          <i class="fa-solid fa-arrows-rotate"></i> Reset All Filters
        </button>
      </div>
    `;
    return;
  }

  // Group agendas by timeSlot
  const timeBlocks = {};
  filtered.forEach(session => {
    const slot = session.timeSlot || `${session.startTime} - ${session.endTime}`;
    if (!timeBlocks[slot]) {
      timeBlocks[slot] = [];
    }
    timeBlocks[slot].push(session);
  });

  let html = '';
  for (const [slot, sessions] of Object.entries(timeBlocks)) {
    const duration = sessions[0]?.duration || '';
    html += `
      <div class="time-block">
        <div class="time-slot-badge-wrap">
          <div class="time-slot-badge">
            <i class="fa-regular fa-clock" style="color:var(--g-blue); margin-right:4px;"></i>
            ${escapeHtml(slot)}
            <span class="duration">${escapeHtml(duration)}</span>
          </div>
        </div>

        <div class="sessions-column">
          ${sessions.map(s => createAgendaCardHtml(s)).join('')}
        </div>
      </div>
    `;
  }

  elements.scheduleTimeline.innerHTML = html;
}

// Generate HTML for an individual agenda card
function createAgendaCardHtml(session) {
  const isBookmarked = state.bookmarkedIds.has(session.id);
  const trackColor = session.track?.color || '#4285F4';
  const trackName = session.track?.name || 'General';
  const stageName = session.stage?.name || session.stageId;

  const speakersHtml = (session.speakerProfiles || []).map(spk => `
    <div class="speaker-chip" onclick="showSpeakerModal('${spk.id}')" title="${escapeHtml(spk.name)} - ${escapeHtml(spk.role || '')}">
      <img src="${spk.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}" alt="${escapeHtml(spk.name)}" class="speaker-avatar-mini" loading="lazy">
      <span class="speaker-name-mini">${escapeHtml(spk.name)}</span>
    </div>
  `).join('');

  const tagsHtml = (session.tags || []).slice(0, 4).map(t => `
    <span class="tag-chip">#${escapeHtml(t)}</span>
  `).join('');

  return `
    <article class="agenda-card" style="border-left-color: ${trackColor};" id="card-${session.id}">
      <div class="agenda-card-header">
        <div class="card-badges">
          <span class="badge-tag" style="background:${session.track?.badgeBg || 'rgba(66,133,244,0.1)'}; color:${trackColor}; border:1px solid ${trackColor};">
            ${escapeHtml(trackName)}
          </span>
          <span class="stage-badge">
            <i class="fa-solid fa-map-pin" style="color:${trackColor};"></i>
            ${escapeHtml(stageName)}
          </span>
          <span class="level-badge">${escapeHtml(session.level || 'All Audiences')}</span>
        </div>

        <button 
          class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}" 
          onclick="toggleBookmark('${session.id}', event)" 
          title="${isBookmarked ? 'Remove from My Schedule' : 'Add to My Schedule'}"
          aria-label="Bookmark session"
        >
          <i class="${isBookmarked ? 'fa-solid' : 'fa-regular'} fa-star"></i>
        </button>
      </div>

      <h3 class="agenda-title" onclick="openSessionModal('${session.id}')">
        ${escapeHtml(session.title)}
      </h3>

      <p class="agenda-description">
        ${escapeHtml(session.description || '')}
      </p>

      <div class="agenda-card-footer">
        <div class="speakers-list-mini">
          ${speakersHtml.length > 0 ? speakersHtml : '<span style="font-size:0.75rem; color:var(--text-muted);"><i class="fa-solid fa-mug-hot"></i> Open Event & Networking</span>'}
        </div>

        <div style="display:flex; align-items:center; gap:0.5rem;">
          <div class="tag-list-chips">
            ${tagsHtml}
          </div>
          <button class="card-action-btn" onclick="openSessionModal('${session.id}')">
            <span>Details</span> <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    </article>
  `;
}

// ==================== RENDERING: SPEAKERS DIRECTORY ====================

function renderSpeakers() {
  if (!elements.speakersGrid) return;
  const list = state.speakers;

  if (elements.speakersCountText) {
    elements.speakersCountText.textContent = `Showing all ${list.length} speakers & industry leaders`;
  }

  if (list.length === 0) {
    elements.speakersGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-microphone-slash empty-icon"></i>
        <h3 class="empty-title">No speakers found</h3>
      </div>
    `;
    return;
  }

  const html = list.map(spk => {
    const talkItems = (spk.sessions || []).map(sess => `
      <div class="speaker-talk-item" onclick="openSessionModal('${sess.id}')" title="Click to view details">
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:85%;">
          <i class="fa-regular fa-clock" style="font-size:0.7rem; color:var(--g-blue); margin-right:4px;"></i>
          ${escapeHtml(sess.title)}
        </span>
        <i class="fa-solid fa-chevron-right" style="font-size:0.65rem; color:var(--text-muted);"></i>
      </div>
    `).join('');

    return `
      <div class="speaker-card">
        ${spk.featured ? '<span class="featured-ribbon"><i class="fa-solid fa-award"></i> Featured</span>' : ''}
        
        <div class="speaker-avatar-wrap">
          <img src="${spk.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}" alt="${escapeHtml(spk.name)}" class="speaker-avatar-img" loading="lazy">
        </div>

        <h3 class="speaker-name">${escapeHtml(spk.name)}</h3>
        <div class="speaker-org">${escapeHtml(spk.organization || '')}</div>
        <div class="speaker-role">${escapeHtml(spk.role || '')}</div>

        <p class="speaker-bio-short">${escapeHtml(spk.bio || '')}</p>

        <div class="speaker-socials">
          ${spk.socials?.twitter ? `<a href="${spk.socials.twitter}" target="_blank" rel="noopener" class="social-btn" title="Twitter / X"><i class="fa-brands fa-x-twitter"></i></a>` : ''}
          ${spk.socials?.linkedin ? `<a href="${spk.socials.linkedin}" target="_blank" rel="noopener" class="social-btn" title="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>` : ''}
          ${spk.socials?.github ? `<a href="${spk.socials.github}" target="_blank" rel="noopener" class="social-btn" title="GitHub"><i class="fa-brands fa-github"></i></a>` : ''}
        </div>

        <div class="speaker-talks-header">
          Scheduled Talk${spk.sessions?.length > 1 ? 's' : ''} (${spk.sessions?.length || 0})
        </div>

        <div class="speaker-talks-list">
          ${talkItems || '<span style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">No active talks</span>'}
        </div>
      </div>
    `;
  }).join('');

  elements.speakersGrid.innerHTML = html;
}

// ==================== RENDERING: MY SCHEDULE / BOOKMARKS ====================

function renderBookmarks() {
  if (!elements.bookmarksTimeline) return;
  const bookmarkedSessions = state.agendas.filter(a => state.bookmarkedIds.has(a.id));

  updateBookmarkBadges();

  if (bookmarkedSessions.length === 0) {
    elements.bookmarksTimeline.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-star empty-icon" style="color:var(--g-yellow);"></i>
        <h3 class="empty-title">Your schedule is empty</h3>
        <p class="empty-desc">Browse the DevFest agenda and click the star icon on any talk or lab to build your personalized conference day.</p>
        <button class="btn-primary" onclick="switchTab('schedule')">
          <i class="fa-regular fa-calendar-check"></i> Explore DevFest Schedule
        </button>
      </div>
    `;
    return;
  }

  // Group bookmarked agendas by timeSlot
  const timeBlocks = {};
  bookmarkedSessions.forEach(session => {
    const slot = session.timeSlot || `${session.startTime} - ${session.endTime}`;
    if (!timeBlocks[slot]) {
      timeBlocks[slot] = [];
    }
    timeBlocks[slot].push(session);
  });

  let html = `
    <div style="background:var(--bg-surface); padding:1rem 1.25rem; border-radius:var(--radius-md); border:1px solid var(--border-color); margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
      <div>
        <strong style="color:var(--g-blue); font-size:1rem;">Plan Overview</strong>
        <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:2px;">You have selected <strong>${bookmarkedSessions.length}</strong> session${bookmarkedSessions.length === 1 ? '' : 's'}.</p>
      </div>
      <button class="btn-primary" onclick="downloadAllBookmarksIcs()">
        <i class="fa-regular fa-calendar-plus"></i> Export Full Day to Google / Apple Calendar
      </button>
    </div>
  `;

  for (const [slot, sessions] of Object.entries(timeBlocks)) {
    const duration = sessions[0]?.duration || '';
    const hasConflict = sessions.length > 1;

    html += `
      <div class="time-block">
        <div class="time-slot-badge-wrap">
          <div class="time-slot-badge" style="${hasConflict ? 'border-left-color: var(--g-red);' : ''}">
            <i class="fa-regular fa-clock" style="color:var(--g-blue); margin-right:4px;"></i>
            ${escapeHtml(slot)}
            <span class="duration">${escapeHtml(duration)}</span>
            ${hasConflict ? '<span style="display:block; font-size:0.65rem; color:var(--g-red); font-weight:800; margin-top:4px;"><i class="fa-solid fa-triangle-exclamation"></i> OVERLAP</span>' : ''}
          </div>
        </div>

        <div class="sessions-column">
          ${sessions.map(s => createAgendaCardHtml(s)).join('')}
        </div>
      </div>
    `;
  }

  elements.bookmarksTimeline.innerHTML = html;
}

// ==================== BOOKMARK ACTIONS ====================

function toggleBookmark(sessionId, event) {
  if (event) {
    event.stopPropagation();
  }

  const isSaved = state.bookmarkedIds.has(sessionId);
  if (isSaved) {
    state.bookmarkedIds.delete(sessionId);
    showToast('Removed session from your DevFest schedule');
  } else {
    state.bookmarkedIds.add(sessionId);
    showToast('Saved to your DevFest schedule! ⭐');
  }

  localStorage.setItem('devfest_kisumu_bookmarks', JSON.stringify(Array.from(state.bookmarkedIds)));
  updateBookmarkBadges();

  // Update card buttons in DOM
  const card = document.getElementById(`card-${sessionId}`);
  if (card) {
    const btn = card.querySelector('.bookmark-btn');
    if (btn) {
      if (state.bookmarkedIds.has(sessionId)) {
        btn.classList.add('bookmarked');
        btn.innerHTML = '<i class="fa-solid fa-star"></i>';
      } else {
        btn.classList.remove('bookmarked');
        btn.innerHTML = '<i class="fa-regular fa-star"></i>';
      }
    }
  }

  // Update modal button if currently open
  if (state.activeModalSession && state.activeModalSession.id === sessionId) {
    updateModalBookmarkBtn(state.activeModalSession);
  }

  // Re-render bookmarks view if active
  if (state.activeTab === 'bookmarks') {
    renderBookmarks();
  }
}

function updateBookmarkBadges() {
  const count = state.bookmarkedIds.size;
  if (elements.bookmarkCountNav) elements.bookmarkCountNav.textContent = count;
  if (elements.bookmarkCountMobile) elements.bookmarkCountMobile.textContent = count;
}

function clearAllBookmarks() {
  if (state.bookmarkedIds.size === 0) return;
  if (confirm('Are you sure you want to clear your personalized DevFest schedule?')) {
    state.bookmarkedIds.clear();
    localStorage.removeItem('devfest_kisumu_bookmarks');
    updateBookmarkBadges();
    renderBookmarks();
    renderSchedule();
    showToast('Personalized schedule cleared');
  }
}

// ==================== MODAL DIALOG ====================

function openSessionModal(sessionId) {
  const session = state.agendas.find(a => a.id === sessionId);
  if (!session) return;

  state.activeModalSession = session;

  const trackColor = session.track?.color || '#4285F4';
  const trackName = session.track?.name || 'General Track';

  elements.modalTrackBadge.textContent = trackName;
  elements.modalTrackBadge.style.background = session.track?.badgeBg || 'rgba(66,133,244,0.1)';
  elements.modalTrackBadge.style.color = trackColor;
  elements.modalTrackBadge.style.borderColor = trackColor;

  elements.modalTitle.textContent = session.title;
  elements.modalTime.textContent = `${session.startTime} - ${session.endTime} (${session.duration})`;
  elements.modalStage.textContent = `${session.stage?.name || session.stageId} (${session.stage?.location || 'Main Floor'})`;
  elements.modalLevel.textContent = session.level || 'All Audiences';
  elements.modalType.textContent = session.sessionType || 'Session';
  elements.modalDescription.textContent = session.description || 'No description provided.';

  // Prerequisites
  if (session.prerequisites && session.prerequisites !== 'None') {
    elements.modalPrerequisitesWrap.style.display = 'block';
    elements.modalPrerequisites.textContent = session.prerequisites;
  } else {
    elements.modalPrerequisitesWrap.style.display = 'none';
  }

  // Presenters
  const spkHtml = (session.speakerProfiles || []).map(spk => `
    <div class="modal-speaker-card">
      <img src="${spk.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}" alt="${escapeHtml(spk.name)}" class="modal-speaker-avatar">
      <div style="flex:1;">
        <h4 style="font-size:1.05rem; font-weight:800; color:var(--text-primary); margin-bottom:2px;">${escapeHtml(spk.name)}</h4>
        <div style="font-size:0.8rem; color:var(--g-blue); font-weight:700;">${escapeHtml(spk.organization || '')}</div>
        <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:0.5rem;">${escapeHtml(spk.role || '')}</div>
        <p style="font-size:0.82rem; color:var(--text-secondary); line-height:1.45;">${escapeHtml(spk.bio || '')}</p>
        <div class="speaker-socials" style="margin-top:0.5rem; margin-bottom:0;">
          ${spk.socials?.twitter ? `<a href="${spk.socials.twitter}" target="_blank" class="social-btn" title="Twitter"><i class="fa-brands fa-x-twitter"></i></a>` : ''}
          ${spk.socials?.linkedin ? `<a href="${spk.socials.linkedin}" target="_blank" class="social-btn" title="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>` : ''}
          ${spk.socials?.github ? `<a href="${spk.socials.github}" target="_blank" class="social-btn" title="GitHub"><i class="fa-brands fa-github"></i></a>` : ''}
        </div>
      </div>
    </div>
  `).join('');

  elements.modalSpeakersContainer.innerHTML = spkHtml || '<p style="font-size:0.85rem; color:var(--text-muted); font-style:italic;">Open general session & community networking.</p>';

  // Tags
  const tagsHtml = (session.tags || []).map(t => `<span class="tag-chip">#${escapeHtml(t)}</span>`).join('');
  elements.modalTagsContainer.innerHTML = tagsHtml;

  updateModalBookmarkBtn(session);

  elements.modalDownloadIcsBtn.onclick = () => downloadSingleSessionIcs(session);

  // Open modal
  elements.modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function updateModalBookmarkBtn(session) {
  const isSaved = state.bookmarkedIds.has(session.id);
  if (isSaved) {
    elements.modalBookmarkToggleBtn.innerHTML = '<i class="fa-solid fa-star" style="color:var(--g-yellow);"></i> In Your Schedule (Remove)';
    elements.modalBookmarkToggleBtn.style.background = 'var(--bg-secondary)';
    elements.modalBookmarkToggleBtn.style.color = 'var(--text-primary)';
  } else {
    elements.modalBookmarkToggleBtn.innerHTML = '<i class="fa-regular fa-star"></i> Add to My Schedule';
    elements.modalBookmarkToggleBtn.style.background = 'var(--g-blue)';
    elements.modalBookmarkToggleBtn.style.color = '#fff';
  }

  elements.modalBookmarkToggleBtn.onclick = () => {
    toggleBookmark(session.id);
  };
}

function closeModal() {
  elements.modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  state.activeModalSession = null;
}

function showSpeakerModal(speakerId) {
  switchTab('speakers');
  const targetCard = Array.from(document.querySelectorAll('.speaker-card')).find(c => {
    return c.textContent.includes(speakerId);
  });
  if (targetCard) {
    targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ==================== CALENDAR .ICS EXPORT ====================

function createIcsCalendarContent(sessions) {
  const eventDate = '20261107'; // DevFest Kisumu: Saturday, Nov 7, 2026

  let ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//GDG Kisumu//DevFest 2026 Schedule//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:DevFest Kisumu 2026 Schedule',
    'X-WR-TIMEZONE:Africa/Nairobi'
  ];

  sessions.forEach(sess => {
    // Parse time like "09:30 AM" -> "093000"
    const startParts = parseTimeString(sess.startTime);
    const endParts = parseTimeString(sess.endTime);

    const dtStart = `${eventDate}T${startParts}Z`;
    const dtEnd = `${eventDate}T${endParts}Z`;

    const speakersText = (sess.speakerProfiles || []).map(s => s.name).join(', ');
    const desc = `${sess.description || ''}\\n\\nSpeakers: ${speakersText}\\nTrack: ${sess.track?.name || ''}\\nStage: ${sess.stage?.name || ''}`;

    ics.push('BEGIN:VEVENT');
    ics.push(`UID:devfest-kisumu-2026-${sess.id}@gdgkisumu.org`);
    ics.push(`DTSTAMP:${eventDate}T000000Z`);
    ics.push(`DTSTART:${dtStart}`);
    ics.push(`DTEND:${dtEnd}`);
    ics.push(`SUMMARY:${cleanIcsText(sess.title)}`);
    ics.push(`DESCRIPTION:${cleanIcsText(desc)}`);
    ics.push(`LOCATION:Ciala Resort, Kisumu, Kenya (${sess.stage?.name || 'Main Stage'})`);
    ics.push('STATUS:CONFIRMED');
    ics.push('END:VEVENT');
  });

  ics.push('END:VCALENDAR');
  return ics.join('\r\n');
}

function parseTimeString(timeStr) {
  if (!timeStr) return '090000';
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return '090000';
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = match[3].toUpperCase();

  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  // Subtract 3 hours for UTC representation (EAT is UTC+3)
  hours = (hours - 3 + 24) % 24;

  const hh = hours.toString().padStart(2, '0');
  return `${hh}${minutes}00`;
}

function cleanIcsText(text) {
  return (text || '')
    .replace(/\r\n/g, '\\n')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function downloadSingleSessionIcs(session) {
  const content = createIcsCalendarContent([session]);
  triggerDownload(`DevFest-Kisumu-${session.id}.ics`, content);
  showToast('Calendar (.ics) invite downloaded! Add to Google or Apple Calendar.');
}

function downloadAllBookmarksIcs() {
  const bookmarked = state.agendas.filter(a => state.bookmarkedIds.has(a.id));
  if (bookmarked.length === 0) {
    showToast('No sessions saved in your schedule.', 'error');
    return;
  }
  const content = createIcsCalendarContent(bookmarked);
  triggerDownload('DevFest-Kisumu-2026-MySchedule.ics', content);
  showToast('Exported your personalized DevFest schedule (.ics)!');
}

function triggerDownload(filename, text) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/calendar;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// ==================== TAB NAVIGATION ====================

function switchTab(targetTab) {
  state.activeTab = targetTab;

  elements.navTabs.forEach(btn => {
    if (btn.getAttribute('data-tab') === targetTab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  elements.scheduleView.style.display = targetTab === 'schedule' ? 'block' : 'none';
  elements.speakersView.style.display = targetTab === 'speakers' ? 'block' : 'none';
  elements.bookmarksView.style.display = targetTab === 'bookmarks' ? 'block' : 'none';

  if (targetTab === 'schedule') renderSchedule();
  if (targetTab === 'speakers') renderSpeakers();
  if (targetTab === 'bookmarks') renderBookmarks();

  window.scrollTo({ top: elements.scheduleView.offsetTop - 120, behavior: 'smooth' });
}

function resetFilters() {
  state.selectedTrack = 'all';
  state.selectedStage = 'all';
  state.selectedLevel = 'all';
  state.searchQuery = '';

  elements.searchInput.value = '';
  elements.stageFilterSelect.value = 'all';
  elements.levelFilterSelect.value = 'all';

  const buttons = elements.trackPillsContainer.querySelectorAll('.track-pill-btn');
  buttons.forEach(b => {
    if (b.getAttribute('data-track') === 'all') {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  renderSchedule();
  showToast('Filters reset to default');
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
  // Theme toggle
  elements.themeToggleBtn.addEventListener('click', toggleTheme);

  // Tab navigation
  elements.navTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  // Search input with debounce
  let searchTimeout = null;
  elements.searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = e.target.value;
      renderSchedule();
      if (state.activeTab === 'bookmarks') renderBookmarks();
    }, 200);
  });

  // Stage dropdown filter
  elements.stageFilterSelect.addEventListener('change', (e) => {
    state.selectedStage = e.target.value;
    renderSchedule();
    if (state.activeTab === 'bookmarks') renderBookmarks();
  });

  // Level dropdown filter
  elements.levelFilterSelect.addEventListener('change', (e) => {
    state.selectedLevel = e.target.value;
    renderSchedule();
    if (state.activeTab === 'bookmarks') renderBookmarks();
  });

  // All Tracks Pill Click
  const allTrackBtn = elements.trackPillsContainer.querySelector('[data-track="all"]');
  if (allTrackBtn) {
    allTrackBtn.addEventListener('click', () => setTrackFilter('all'));
  }

  // Modal interactions
  elements.modalCloseBtn.addEventListener('click', closeModal);
  elements.modalOverlay.addEventListener('click', (e) => {
    if (e.target === elements.modalOverlay) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.modalOverlay.classList.contains('open')) {
      closeModal();
    }
  });

  // Bookmarks toolbar buttons
  if (elements.exportIcalBtn) {
    elements.exportIcalBtn.addEventListener('click', downloadAllBookmarksIcs);
  }
  if (elements.clearBookmarksBtn) {
    elements.clearBookmarksBtn.addEventListener('click', clearAllBookmarks);
  }
}

// ==================== UTILITIES ====================

function escapeHtml(text) {
  if (typeof text !== 'string') return text || '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let icon = '<i class="fa-solid fa-check" style="color:var(--g-green);"></i>';
  if (type === 'error') {
    icon = '<i class="fa-solid fa-circle-exclamation" style="color:var(--g-red);"></i>';
  }

  toast.innerHTML = `${icon} <span>${escapeHtml(message)}</span>`;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// Expose globals for inline event handlers
window.toggleBookmark = toggleBookmark;
window.openSessionModal = openSessionModal;
window.showSpeakerModal = showSpeakerModal;
window.switchTab = switchTab;
window.resetFilters = resetFilters;
window.downloadAllBookmarksIcs = downloadAllBookmarksIcs;
