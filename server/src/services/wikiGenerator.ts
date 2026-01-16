import db, { queries } from '../models/database.js';

interface SOTFAData {
  year: number;
  intro: string;
  committee: CommitteeMember[];
  ecReport: ECReport;
  ccReport: CCReport;
  shipReports: ShipReport[];
  taskforces: TaskforceInfo[];
  simmingStats: SimmingStatsData;
  lookingAhead?: string;
}

interface CommitteeMember {
  name: string;
  rank: string;
  character: string;
  wikiUser: string;
  role?: string;
}

interface ECReport {
  content: string;
  actions: ECAction[];
}

interface ECAction {
  number: string;
  description: string;
}

interface CCReport {
  captainsCouncil: CCMember[];
  commanders: CCMember[];
  firstOfficers: CCMember[];
  promotions: string[];
  speciesVotes: string[];
  otherNotes: string[];
}

interface CCMember {
  rank: string;
  character: string;
  wikiLink: string;
  position?: string;
  shipAssignment?: string;
}

interface ShipReport {
  shipName: string;
  imageFile: string;
  coName: string;
  coCharacter: string;
  xoName: string;
  xoCharacter: string;
  summary: string;
}

interface TaskforceInfo {
  name: string;
  facilitator: string;
  facilitatorWiki: string;
  deputyFacilitator?: string;
  deputyWiki?: string;
  memberCount: number;
  contactInfo: string;
  specialNotes?: string;
  additionalStaff?: { title: string; name: string; wiki: string }[];
}

interface SimmingStatsData {
  summary: string;
  chartDescriptions: string[];
}

// Generate headshot template
function headshot(character: string, displayName: string): string {
  return `{{Headshot|Officer|${character}|${displayName}}}`;
}

// Generate USS template
function ussTemplate(shipName: string, registry?: string): string {
  if (registry) {
    return `{{USS|${shipName}|${registry}}}`;
  }
  return `{{USS|${shipName}}}`;
}

// Generate wiki link
function wikiLink(pageName: string, displayText?: string): string {
  if (displayText) {
    return `[[${pageName}|${displayText}]]`;
  }
  return `[[${pageName}]]`;
}

// Generate user link
function userLink(username: string, displayName: string): string {
  return `[[User:${username}|${displayName}]]`;
}

// Generate the full SOTFA MediaWiki code
export function generateSOTFAWikiCode(data: SOTFAData): string {
  const sections: string[] = [];

  // Header templates
  sections.push(`{{Member Resources}}`);
  sections.push(`{{Start-85%}}`);
  sections.push(`{{State of the Federation Address}}`);
  sections.push(`{{LCARS Page Title|${data.year} State of the Federation Address|tan}}`);

  // Introduction
  sections.push(data.intro);
  sections.push('');

  // Committee
  sections.push(`This year's '''SOTFA Committee''' wishes you happiness and health, and a welcome to this writing community.`);
  data.committee.forEach(member => {
    const role = member.role ? ` (${member.role})` : '';
    sections.push(`* '''${member.name}''', aka ${member.rank} ${userLink(member.wikiUser, member.character)}${role}`);
  });
  sections.push('');

  // Looking Back section header
  sections.push(`= Looking Back At ${data.year - 1} =`);

  // Council Reports
  sections.push(`== ${data.year - 1} Council Reports ==`);

  // EC Report
  sections.push(`=== Executive Council Report ===`);
  sections.push(`{{:Executive Council}}`);
  sections.push(data.ecReport.content);
  sections.push('');
  sections.push(`'''Notable EC measures voted on in ${data.year - 1}:'''`);
  data.ecReport.actions.forEach(action => {
    sections.push(`* '''${action.number}''': ${action.description}`);
  });
  sections.push('');

  // CC Report
  sections.push(`=== Captain's Council Report ===`);
  sections.push(`{{Start Columns}}`);

  // Captain's Council members
  sections.push(`'''Captain's Council'''`);
  data.ccReport.captainsCouncil.forEach(member => {
    let entry = `* '''${member.rank} [[${member.character}]]'''`;
    if (member.position) {
      entry += `, '''${member.position}'''`;
    }
    if (member.shipAssignment) {
      entry += `, ${member.shipAssignment}`;
    }
    sections.push(entry);
  });

  sections.push(`{{Column}}`);

  // Commanders
  sections.push(`'''Commanders'''`);
  data.ccReport.commanders.forEach(member => {
    let entry = `* '''${member.rank} [[${member.character}]]'''`;
    if (member.position) {
      entry += `, ${member.position}`;
    }
    if (member.shipAssignment) {
      entry += ` of ${member.shipAssignment}`;
    }
    sections.push(entry);
  });

  // First Officers
  sections.push(`'''First Officers'''`);
  data.ccReport.firstOfficers.forEach(member => {
    let entry = `* '''${member.rank}. [[${member.character}]]'''`;
    if (member.shipAssignment) {
      entry += `, First Officer of ${member.shipAssignment}`;
    }
    sections.push(entry);
  });

  sections.push(`{{End Columns}}`);
  sections.push('');

  // CC Promotions
  if (data.ccReport.promotions.length > 0) {
    sections.push(`==== Promotions ====`);
    data.ccReport.promotions.forEach(promo => {
      sections.push(`*${promo}`);
    });
    sections.push('');
  }

  // Species Votes
  if (data.ccReport.speciesVotes.length > 0) {
    sections.push(`==== Species votes ====`);
    data.ccReport.speciesVotes.forEach(vote => {
      sections.push(`*${vote}`);
    });
    sections.push('');
  }

  // Other CC Notes
  data.ccReport.otherNotes.forEach(note => {
    sections.push(note);
    sections.push('');
  });

  // Ship Reports
  sections.push(`= ${data.year - 1} Installation Reports =`);

  data.shipReports.forEach(ship => {
    sections.push(`== ${ship.shipName} ==`);
    sections.push(`[[Image:${ship.imageFile}|right|200px]]`);
    sections.push(`{|`);
    sections.push(`|${headshot(ship.coCharacter, ship.coCharacter.split(' ').pop() || ship.coCharacter)}`);
    sections.push(`|${headshot(ship.xoCharacter, ship.xoCharacter.split(' ').pop() || ship.xoCharacter)}`);
    sections.push(`|}`);
    sections.push(ship.summary);
    sections.push('');
  });

  // Simming Stats
  sections.push(`= Fleet Simming Rates =`);
  sections.push(data.simmingStats.summary);
  sections.push('');
  data.simmingStats.chartDescriptions.forEach(desc => {
    sections.push(desc);
    sections.push('');
  });

  // Taskforces
  sections.push(`= Taskforce Contacts =`);
  sections.push(`*'''Fleetwide Taskforce Coordinator:''' Commander [[User:Serala|Serala]]`);
  sections.push(`As well as our taskforces, you may be interested in the activities undertaken by our [[Squadrons]] and [[Guilds]]!`);

  data.taskforces.forEach(tf => {
    sections.push(`== [[${tf.name}]] ==`);
    sections.push(`* '''Facilitator''': ${userLink(tf.facilitatorWiki, tf.facilitator)}`);
    if (tf.deputyFacilitator && tf.deputyWiki) {
      sections.push(`* '''Deputy Facilitator''': ${userLink(tf.deputyWiki, tf.deputyFacilitator)}`);
    }
    if (tf.additionalStaff) {
      tf.additionalStaff.forEach(staff => {
        sections.push(`* '''${staff.title}''': ${userLink(staff.wiki, staff.name)}`);
      });
    }
    sections.push(`* '''Member Count''': ${tf.memberCount}${tf.facilitator ? ' including facilitator' : ''}`);
    sections.push(`* '''How to contact''': ${tf.contactInfo}`);
    if (tf.specialNotes) {
      sections.push(`* '''Special Note''': ${tf.specialNotes}`);
    }
  });

  // Looking Ahead (optional)
  if (data.lookingAhead) {
    sections.push(`= Looking Ahead to ${data.year} =`);
    sections.push(data.lookingAhead);
    sections.push('');
  }

  // Footer templates
  sections.push(`{{End}}`);
  sections.push(`{{Member Resources Nav}}`);
  sections.push(`[[Category:State of the Federation Address]]`);

  return sections.join('\n');
}

// Generate wiki code from database content
export function generateFromDatabase(sotfaYearId: number): string {
  // Fetch all sections
  const sections = db.prepare('SELECT * FROM sections WHERE sotfa_year_id = ? ORDER BY order_index').all(sotfaYearId) as any[];
  const shipReports = db.prepare(`
    SELECT sr.*, s.section_key FROM ship_reports sr
    JOIN sections s ON sr.section_id = s.id
    WHERE s.sotfa_year_id = ?
  `).all(sotfaYearId) as any[];
  const councilActions = db.prepare('SELECT * FROM council_actions WHERE sotfa_year_id = ?').all(sotfaYearId) as any[];
  const councilMembers = db.prepare('SELECT * FROM council_members WHERE sotfa_year_id = ? ORDER BY order_index').all(sotfaYearId) as any[];
  const taskforces = db.prepare('SELECT * FROM taskforces WHERE sotfa_year_id = ? ORDER BY order_index').all(sotfaYearId) as any[];

  const year = (db.prepare('SELECT year FROM sotfa_years WHERE id = ?').get(sotfaYearId) as any)?.year || new Date().getFullYear();

  // Build the data structure
  const data: SOTFAData = {
    year,
    intro: sections.find(s => s.section_type === 'intro')?.content || '',
    committee: [], // Would be populated from a separate committee table or parsed from intro
    ecReport: {
      content: sections.find(s => s.section_type === 'ec_report')?.content || '',
      actions: councilActions.filter(a => a.council === 'EC').map(a => ({
        number: a.action_number,
        description: a.description,
      })),
    },
    ccReport: {
      captainsCouncil: councilMembers.filter(m => m.council === 'CC' && m.position?.includes('Captain')).map(m => ({
        rank: m.rank,
        character: m.character_name,
        wikiLink: m.wiki_link,
        position: m.position,
        shipAssignment: m.ship_assignment,
      })),
      commanders: councilMembers.filter(m => m.council === 'CC' && m.rank === 'Commander').map(m => ({
        rank: m.rank,
        character: m.character_name,
        wikiLink: m.wiki_link,
        position: m.position,
        shipAssignment: m.ship_assignment,
      })),
      firstOfficers: councilMembers.filter(m => m.council === 'CC' && m.position?.includes('First Officer')).map(m => ({
        rank: m.rank,
        character: m.character_name,
        wikiLink: m.wiki_link,
        shipAssignment: m.ship_assignment,
      })),
      promotions: councilActions.filter(a => a.council === 'CC' && a.category === 'promotion').map(a => a.description),
      speciesVotes: councilActions.filter(a => a.council === 'CC' && a.category === 'species').map(a => a.description),
      otherNotes: councilActions.filter(a => a.council === 'CC' && !a.category).map(a => a.description),
    },
    shipReports: shipReports.map(sr => ({
      shipName: sr.ship_name,
      imageFile: sr.image_url || `${sr.ship_name.replace(/\s+/g, '_')}.jpg`,
      coName: sr.co_name,
      coCharacter: sr.co_character,
      xoName: sr.xo_name,
      xoCharacter: sr.xo_character,
      summary: sr.summary,
    })),
    taskforces: taskforces.map(tf => ({
      name: tf.name,
      facilitator: tf.facilitator,
      facilitatorWiki: tf.facilitator_wiki,
      deputyFacilitator: tf.deputy_facilitator,
      deputyWiki: tf.deputy_wiki,
      memberCount: tf.member_count,
      contactInfo: tf.contact_info,
      specialNotes: tf.special_notes,
    })),
    simmingStats: {
      summary: sections.find(s => s.section_type === 'simming_rates')?.content || '',
      chartDescriptions: [],
    },
    lookingAhead: sections.find(s => s.section_type === 'looking_ahead')?.content,
  };

  return generateSOTFAWikiCode(data);
}

// Preview a single section
export function previewSection(sectionType: string, content: any): string {
  switch (sectionType) {
    case 'ship_report':
      return generateShipReportPreview(content);
    case 'taskforce':
      return generateTaskforcePreview(content);
    case 'ec_action':
      return `* '''${content.number}''': ${content.description}`;
    default:
      return content.text || '';
  }
}

function generateShipReportPreview(report: ShipReport): string {
  const lines = [
    `== ${report.shipName} ==`,
    `[[Image:${report.imageFile}|right|200px]]`,
    `{|`,
    `|${headshot(report.coCharacter, report.coCharacter.split(' ').pop() || report.coCharacter)}`,
    `|${headshot(report.xoCharacter, report.xoCharacter.split(' ').pop() || report.xoCharacter)}`,
    `|}`,
    report.summary,
  ];
  return lines.join('\n');
}

function generateTaskforcePreview(tf: TaskforceInfo): string {
  const lines = [
    `== [[${tf.name}]] ==`,
    `* '''Facilitator''': ${userLink(tf.facilitatorWiki, tf.facilitator)}`,
  ];

  if (tf.deputyFacilitator && tf.deputyWiki) {
    lines.push(`* '''Deputy Facilitator''': ${userLink(tf.deputyWiki, tf.deputyFacilitator)}`);
  }

  lines.push(`* '''Member Count''': ${tf.memberCount} including facilitator`);
  lines.push(`* '''How to contact''': ${tf.contactInfo}`);

  if (tf.specialNotes) {
    lines.push(`* '''Special Note''': ${tf.specialNotes}`);
  }

  return lines.join('\n');
}
