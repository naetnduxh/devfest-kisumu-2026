const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Path to agendas JSON file
const DATA_FILE_PATH = fs.existsSync(path.join(__dirname, 'data', 'agendas.json'))
  ? path.join(__dirname, 'data', 'agendas.json')
  : path.join(__dirname, 'agendas.json');

/**
 * Helper to safely read and parse agendas.json
 * Reads fresh on each request so changes to agendas.json reflect immediately
 */
function getEventData() {
  try {
    const raw = fs.readFileSync(DATA_FILE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading agendas.json:', err.message);
    throw new Error('Could not load agendas data');
  }
}

/**
 * Enriches agenda item with resolved speaker objects and track/stage metadata
 */
function enrichAgendaItem(agenda, allSpeakers, allTracks, allStages) {
  const speakers = (agenda.speakers || []).map(spkId => {
    return allSpeakers.find(s => s.id === spkId) || { id: spkId, name: 'Guest Speaker' };
  });

  const track = allTracks.find(t => t.id === agenda.trackId) || {
    id: agenda.trackId,
    name: agenda.trackId,
    color: '#4285F4'
  };

  const stage = allStages.find(s => s.id === agenda.stageId) || {
    id: agenda.stageId,
    name: agenda.stageId
  };

  return {
    ...agenda,
    speakerProfiles: speakers,
    track,
    stage
  };
}

// ==================== REST API ENDPOINTS ====================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'DevFest Kisumu 2026 Schedule API',
    timestamp: new Date().toISOString()
  });
});

// Event Info
app.get('/api/event', (req, res) => {
  try {
    const data = getEventData();
    res.json({
      success: true,
      event: data.event,
      tracks: data.tracks,
      stages: data.stages
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// All Agendas (with filtering and search)
app.get('/api/agendas', (req, res) => {
  try {
    const data = getEventData();
    const { track, stage, speaker, level, search, type } = req.query;

    let items = (data.agendas || []).map(agenda =>
      enrichAgendaItem(agenda, data.speakers || [], data.tracks || [], data.stages || [])
    );

    // Filter by track ID or track name
    if (track && track !== 'all') {
      const lower = track.toLowerCase();
      items = items.filter(i =>
        i.trackId.toLowerCase() === lower ||
        (i.track && i.track.name.toLowerCase().includes(lower))
      );
    }

    // Filter by stage ID or stage name
    if (stage && stage !== 'all') {
      const lower = stage.toLowerCase();
      items = items.filter(i =>
        i.stageId.toLowerCase() === lower ||
        (i.stage && i.stage.name.toLowerCase().includes(lower))
      );
    }

    // Filter by speaker ID
    if (speaker && speaker !== 'all') {
      items = items.filter(i => (i.speakers || []).includes(speaker));
    }

    // Filter by difficulty level
    if (level && level !== 'all') {
      items = items.filter(i => i.level.toLowerCase() === level.toLowerCase());
    }

    // Filter by session type
    if (type && type !== 'all') {
      items = items.filter(i => (i.sessionType || '').toLowerCase().includes(type.toLowerCase()));
    }

    // Keyword search across title, description, speaker names, and tags
    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      items = items.filter(i => {
        const titleMatch = (i.title || '').toLowerCase().includes(q);
        const descMatch = (i.description || '').toLowerCase().includes(q);
        const tagsMatch = (i.tags || []).some(t => t.toLowerCase().includes(q));
        const speakerMatch = (i.speakerProfiles || []).some(s =>
          (s.name || '').toLowerCase().includes(q) ||
          (s.organization || '').toLowerCase().includes(q)
        );
        return titleMatch || descMatch || tagsMatch || speakerMatch;
      });
    }

    res.json({
      success: true,
      count: items.length,
      agendas: items
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single Agenda by ID
app.get('/api/agendas/:id', (req, res) => {
  try {
    const data = getEventData();
    const agenda = (data.agendas || []).find(a => a.id === req.params.id);

    if (!agenda) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const enriched = enrichAgendaItem(
      agenda,
      data.speakers || [],
      data.tracks || [],
      data.stages || []
    );

    res.json({ success: true, agenda: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// All Speakers (with their sessions attached)
app.get('/api/speakers', (req, res) => {
  try {
    const data = getEventData();
    const { search, featured } = req.query;

    let speakers = (data.speakers || []).map(spk => {
      const sessions = (data.agendas || [])
        .filter(a => (a.speakers || []).includes(spk.id))
        .map(a => enrichAgendaItem(a, data.speakers, data.tracks, data.stages));

      return {
        ...spk,
        sessionCount: sessions.length,
        sessions
      };
    });

    if (featured === 'true') {
      speakers = speakers.filter(s => s.featured === true);
    }

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      speakers = speakers.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.role || '').toLowerCase().includes(q) ||
        (s.organization || '').toLowerCase().includes(q) ||
        (s.bio || '').toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      count: speakers.length,
      speakers
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single Speaker by ID
app.get('/api/speakers/:id', (req, res) => {
  try {
    const data = getEventData();
    const speaker = (data.speakers || []).find(s => s.id === req.params.id);

    if (!speaker) {
      return res.status(404).json({ success: false, message: 'Speaker not found' });
    }

    const sessions = (data.agendas || [])
      .filter(a => (a.speakers || []).includes(speaker.id))
      .map(a => enrichAgendaItem(a, data.speakers, data.tracks, data.stages));

    res.json({
      success: true,
      speaker: {
        ...speaker,
        sessions
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Tracks list
app.get('/api/tracks', (req, res) => {
  try {
    const data = getEventData();
    res.json({ success: true, tracks: data.tracks || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Stages list
app.get('/api/stages', (req, res) => {
  try {
    const data = getEventData();
    res.json({ success: true, stages: data.stages || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Overall stats
app.get('/api/stats', (req, res) => {
  try {
    const data = getEventData();
    const totalSessions = (data.agendas || []).length;
    const totalSpeakers = (data.speakers || []).length;
    const totalTracks = (data.tracks || []).length;
    const totalStages = (data.stages || []).length;
    const workshops = (data.agendas || []).filter(a =>
      (a.sessionType || '').toLowerCase().includes('workshop') ||
      (a.sessionType || '').toLowerCase().includes('lab')
    ).length;

    res.json({
      success: true,
      stats: {
        ...data.event.stats,
        totalSessions,
        totalSpeakers,
        totalTracks,
        totalStages,
        totalWorkshops: workshops
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Serve frontend SPA fallback
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('DevFest Kisumu 2026 API is running. Create public/index.html to view the frontend.');
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 DevFest Kisumu 2026 Schedule Server Running!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`📁 Agendas Data Source: ${DATA_FILE_PATH}`);
  console.log(`====================================================`);
});
