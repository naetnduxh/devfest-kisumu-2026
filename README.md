# DevFest Kisumu 2026 - Speaker Schedules & Agendas Web Application

A full-stack Node.js & Express web application for **DevFest Kisumu 2026 (Lake City Edition)**, presenting conference speaker schedules, technical keynotes, workshops, and interactive agenda planning.

All event agendas and speaker profiles are driven by a single structured JSON data source (`data/agendas.json` or `agendas.json`).

---

## 🌟 Key Features

1. **Dynamic JSON-Driven Agendas & Speakers**:
   - `data/agendas.json` contains full event metadata, 5 tracks, 4 stages, 10 speaker profiles, and 14 chronological conference sessions.
   - Updates made to `data/agendas.json` are automatically loaded on incoming API requests without restarting the server.
2. **Interactive Schedule Timeline**:
   - Organized chronologically by time blocks (e.g., 08:00 AM registration through to 05:30 PM closing ceremony).
   - Real-time search across session titles, speaker names, organizations, and topic tags.
   - Quick filtering by **Track** (*AI & Machine Learning*, *Cloud & DevOps*, *Mobile & Modern Web*, *Cybersecurity & IoT*, *Design, Career & Community*).
   - Filtering by **Stage / Room** (*Lake Victoria Auditorium*, *Riat Hills Stage*, *Dunga Beach Hall*, *Kibuye Innovation Lab*).
   - Filtering by **Difficulty Level** (*Beginner*, *Intermediate*, *Advanced*, *All Audiences*).
3. **Featured Speaker Directory**:
   - Dedicated view showcasing each speaker's bio, company/organization, social links (Twitter/X, LinkedIn, GitHub), and direct links to their scheduled sessions.
4. **"My Schedule" & Conflict Detection**:
   - Attendees can bookmark sessions with one click (persisted to `localStorage`).
   - Dedicated view shows personalized day plans and flags scheduling overlaps.
   - 1-click **Export to iCalendar (.ics)** to import into Google Calendar or Apple Calendar.
5. **Session Details Dialog**:
   - Modal popup showing prerequisites, abstract overview, speaker details, and room location.
6. **Modern GDG / Lake City Design**:
   - Google Developer Group signature styling (Blue, Red, Yellow, Green).
   - Dark mode & Light mode with instant toggle.
   - Fully responsive for mobile phones, tablets, and desktop displays.

---

## 🚀 Quick Start

### 1. Requirements
- Node.js (v18+ or v24+)
- npm

### 2. Start the Server
Run from the project root:

```bash
# Start standard server
npm start
# OR
node server.js
```

### 3. Open in Browser
Visit: **[http://localhost:3000](http://localhost:3000)**

---

## 📡 REST API Documentation

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/api/health` | `GET` | Server health check and timestamp |
| `/api/event` | `GET` | Event overview, theme, venue, tracks, and stages |
| `/api/agendas` | `GET` | All agenda items (supports query parameters) |
| `/api/agendas/:id` | `GET` | Single session details by ID |
| `/api/speakers` | `GET` | All speakers enriched with their sessions |
| `/api/speakers/:id`| `GET` | Single speaker by ID with all their talks |
| `/api/tracks` | `GET` | List of all tracks and color codes |
| `/api/stages` | `GET` | List of all conference stages and capacities |
| `/api/stats` | `GET` | Summary statistics (sessions, speakers, workshops) |

### API Query Filters for `/api/agendas`:
- `?search=<keyword>`: Full-text search (e.g. `?search=flutter`, `?search=agents`)
- `?track=<trackId>`: Filter by track (e.g. `?track=ai-ml`, `?track=cloud-devops`)
- `?stage=<stageId>`: Filter by stage (e.g. `?stage=auditorium`)
- `?level=<level>`: Filter by level (`Beginner`, `Intermediate`, `Advanced`)
- `?speaker=<speakerId>`: Filter sessions by speaker ID

---

## 📂 Project Structure

```text
├── data/
│   └── agendas.json        # Single source of truth: agendas, speakers, tracks, stages
├── public/
│   ├── css/
│   │   └── style.css       # GDG Lake City styling, dark/light theme, responsive layout
│   ├── js/
│   │   └── app.js          # Client-side filtering, modal, calendar .ics export, bookmarks
│   └── index.html          # Single page application markup
├── package.json            # Node.js project configuration and dependencies
├── server.js               # Express server and REST API routes
└── DEVFEST_README.md       # Project documentation
```
