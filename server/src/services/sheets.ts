import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

interface SheetResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface RosterEntry {
  characterName: string;
  playerName: string;
  rank: string;
  position: string;
  ship: string;
  wikiLink?: string;
  discordUsername?: string;
  email?: string;
}

interface SimmingStats {
  ship: string;
  month: number;
  year: number;
  simCount: number;
}

export async function fetchRoster(): Promise<SheetResponse> {
  const spreadsheetId = process.env.ROSTER_SPREADSHEET_ID;

  if (!spreadsheetId) {
    return { success: false, error: 'Roster spreadsheet ID not configured' };
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Roster!A:J', // Adjust based on your sheet structure
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { success: false, error: 'No roster data found' };
    }

    // Assume first row is headers
    const headers = rows[0].map((h: string) => h.toLowerCase().replace(/\s+/g, '_'));
    const roster: RosterEntry[] = rows.slice(1).map(row => {
      const entry: any = {};
      headers.forEach((header: string, index: number) => {
        entry[header] = row[index] || '';
      });
      return {
        characterName: entry.character_name || entry.character || '',
        playerName: entry.player_name || entry.player || '',
        rank: entry.rank || '',
        position: entry.position || '',
        ship: entry.ship || entry.vessel || '',
        wikiLink: entry.wiki_link || entry.wiki || '',
        discordUsername: entry.discord || '',
        email: entry.email || '',
      };
    });

    return { success: true, data: roster };
  } catch (error) {
    console.error('Failed to fetch roster:', error);
    return { success: false, error: 'Failed to fetch roster data' };
  }
}

export async function fetchRosterByShip(shipName: string): Promise<SheetResponse> {
  const rosterResult = await fetchRoster();

  if (!rosterResult.success) {
    return rosterResult;
  }

  const filtered = (rosterResult.data as RosterEntry[]).filter(
    entry => entry.ship.toLowerCase().includes(shipName.toLowerCase())
  );

  return { success: true, data: filtered };
}

export async function fetchCommandStaff(): Promise<SheetResponse> {
  const rosterResult = await fetchRoster();

  if (!rosterResult.success) {
    return rosterResult;
  }

  // Filter for command positions
  const commandPositions = [
    'commanding officer',
    'first officer',
    'executive officer',
    'co',
    'xo',
    'fo',
    '2o',
    'second officer',
  ];

  const filtered = (rosterResult.data as RosterEntry[]).filter(entry =>
    commandPositions.some(pos => entry.position.toLowerCase().includes(pos))
  );

  return { success: true, data: filtered };
}

export async function fetchAriaStats(): Promise<SheetResponse> {
  const spreadsheetId = process.env.ARIA_SPREADSHEET_ID;

  if (!spreadsheetId) {
    return { success: false, error: 'Project Aria spreadsheet ID not configured' };
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Stats!A:E', // Adjust based on your Aria sheet structure
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { success: false, error: 'No stats data found' };
    }

    // Parse stats data
    const headers = rows[0].map((h: string) => h.toLowerCase().replace(/\s+/g, '_'));
    const stats: SimmingStats[] = rows.slice(1).map(row => ({
      ship: row[headers.indexOf('ship')] || row[0] || '',
      month: parseInt(row[headers.indexOf('month')] || row[1]) || 0,
      year: parseInt(row[headers.indexOf('year')] || row[2]) || 0,
      simCount: parseInt(row[headers.indexOf('sim_count')] || row[headers.indexOf('sims')] || row[3]) || 0,
    }));

    return { success: true, data: stats };
  } catch (error) {
    console.error('Failed to fetch Aria stats:', error);
    return { success: false, error: 'Failed to fetch simming stats' };
  }
}

export async function fetchYearlyStats(year: number): Promise<SheetResponse> {
  const statsResult = await fetchAriaStats();

  if (!statsResult.success) {
    return statsResult;
  }

  const filtered = (statsResult.data as SimmingStats[]).filter(stat => stat.year === year);

  // Aggregate by ship
  const shipStats: Record<string, { total: number; monthly: number[] }> = {};

  filtered.forEach(stat => {
    if (!shipStats[stat.ship]) {
      shipStats[stat.ship] = { total: 0, monthly: Array(12).fill(0) };
    }
    shipStats[stat.ship].total += stat.simCount;
    if (stat.month >= 1 && stat.month <= 12) {
      shipStats[stat.ship].monthly[stat.month - 1] = stat.simCount;
    }
  });

  return { success: true, data: shipStats };
}

export async function getShipsFromRoster(): Promise<string[]> {
  const rosterResult = await fetchRoster();

  if (!rosterResult.success) {
    return [];
  }

  const ships = new Set<string>();
  (rosterResult.data as RosterEntry[]).forEach(entry => {
    if (entry.ship) {
      ships.add(entry.ship);
    }
  });

  return Array.from(ships).sort();
}
