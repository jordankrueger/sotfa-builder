import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = process.env.DATABASE_PATH || './data/sotfa.db';
const dbDir = path.dirname(dbPath);

// Ensure the data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Initialize schema
db.exec(`
  -- Users table
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'ship_contributor', 'taskforce_lead', 'reviewer')),
    ship_assignment TEXT,
    taskforce_assignment TEXT,
    wiki_username TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  );

  -- SOTFA Years (for future expansion, currently single year)
  CREATE TABLE IF NOT EXISTS sotfa_years (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER UNIQUE NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('draft', 'review', 'published')),
    deadline DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    published_at DATETIME
  );

  -- Sections of the SOTFA
  CREATE TABLE IF NOT EXISTS sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sotfa_year_id INTEGER NOT NULL,
    section_type TEXT NOT NULL,
    section_key TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    status TEXT NOT NULL CHECK(status IN ('pending', 'draft', 'submitted', 'approved')),
    assigned_to INTEGER,
    deadline DATE,
    order_index INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    submitted_at DATETIME,
    FOREIGN KEY (sotfa_year_id) REFERENCES sotfa_years(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    UNIQUE(sotfa_year_id, section_key)
  );

  -- Section types: intro, ec_report, cc_report, ship_report, taskforce, simming_rates, looking_ahead

  -- Ship Reports (detailed tracking)
  CREATE TABLE IF NOT EXISTS ship_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL,
    ship_name TEXT NOT NULL,
    co_name TEXT,
    co_character TEXT,
    xo_name TEXT,
    xo_character TEXT,
    image_url TEXT,
    summary TEXT,
    highlights TEXT,
    missions TEXT,
    ooc_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES sections(id)
  );

  -- EC/CC Actions tracking
  CREATE TABLE IF NOT EXISTS council_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sotfa_year_id INTEGER NOT NULL,
    council TEXT NOT NULL CHECK(council IN ('EC', 'CC')),
    action_number TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sotfa_year_id) REFERENCES sotfa_years(id)
  );

  -- Council Members
  CREATE TABLE IF NOT EXISTS council_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sotfa_year_id INTEGER NOT NULL,
    council TEXT NOT NULL CHECK(council IN ('EC', 'CC')),
    rank TEXT NOT NULL,
    character_name TEXT NOT NULL,
    wiki_link TEXT,
    position TEXT,
    ship_assignment TEXT,
    order_index INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sotfa_year_id) REFERENCES sotfa_years(id)
  );

  -- Taskforce Information
  CREATE TABLE IF NOT EXISTS taskforces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sotfa_year_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    facilitator TEXT,
    facilitator_wiki TEXT,
    deputy_facilitator TEXT,
    deputy_wiki TEXT,
    member_count INTEGER,
    contact_info TEXT,
    special_notes TEXT,
    order_index INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sotfa_year_id) REFERENCES sotfa_years(id)
  );

  -- Simming Stats
  CREATE TABLE IF NOT EXISTS simming_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sotfa_year_id INTEGER NOT NULL,
    ship_name TEXT NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    sim_count INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sotfa_year_id) REFERENCES sotfa_years(id)
  );

  -- AI Usage Tracking
  CREATE TABLE IF NOT EXISTS ai_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    request_type TEXT NOT NULL,
    tokens_used INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Comments/Review Notes
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    comment TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES sections(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Activity Log
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id INTEGER,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Create indexes for performance
  CREATE INDEX IF NOT EXISTS idx_sections_year ON sections(sotfa_year_id);
  CREATE INDEX IF NOT EXISTS idx_sections_status ON sections(status);
  CREATE INDEX IF NOT EXISTS idx_ship_reports_section ON ship_reports(section_id);
  CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id);
  CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_usage(created_at);
`);

export default db;

// Helper functions for common queries
export const queries = {
  // Users
  getUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  createUser: db.prepare(`
    INSERT INTO users (username, email, password_hash, display_name, role, ship_assignment, taskforce_assignment, wiki_username)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateUserLastLogin: db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?'),
  getAllUsers: db.prepare('SELECT id, username, email, display_name, role, ship_assignment, taskforce_assignment FROM users'),

  // SOTFA Years
  getCurrentYear: db.prepare('SELECT * FROM sotfa_years ORDER BY year DESC LIMIT 1'),
  createYear: db.prepare('INSERT INTO sotfa_years (year, status, deadline) VALUES (?, ?, ?)'),
  updateYearStatus: db.prepare('UPDATE sotfa_years SET status = ?, published_at = ? WHERE id = ?'),

  // Sections
  getSectionsByYear: db.prepare('SELECT * FROM sections WHERE sotfa_year_id = ? ORDER BY order_index'),
  getSectionById: db.prepare('SELECT * FROM sections WHERE id = ?'),
  getSectionByKey: db.prepare('SELECT * FROM sections WHERE sotfa_year_id = ? AND section_key = ?'),
  createSection: db.prepare(`
    INSERT INTO sections (sotfa_year_id, section_type, section_key, title, content, status, assigned_to, deadline, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateSectionContent: db.prepare(`
    UPDATE sections SET content = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `),
  updateSectionStatus: db.prepare(`
    UPDATE sections SET status = ?, submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `),

  // Ship Reports
  getShipReportBySection: db.prepare('SELECT * FROM ship_reports WHERE section_id = ?'),
  createShipReport: db.prepare(`
    INSERT INTO ship_reports (section_id, ship_name, co_name, co_character, xo_name, xo_character, image_url, summary, highlights, missions, ooc_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  updateShipReport: db.prepare(`
    UPDATE ship_reports SET co_name = ?, co_character = ?, xo_name = ?, xo_character = ?, image_url = ?,
    summary = ?, highlights = ?, missions = ?, ooc_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `),

  // AI Usage
  getAIUsageToday: db.prepare(`
    SELECT SUM(tokens_used) as total FROM ai_usage
    WHERE user_id = ? AND date(created_at) = date('now')
  `),
  logAIUsage: db.prepare('INSERT INTO ai_usage (user_id, request_type, tokens_used) VALUES (?, ?, ?)'),

  // Activity Log
  logActivity: db.prepare('INSERT INTO activity_log (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)'),
  getRecentActivity: db.prepare('SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?'),
};
