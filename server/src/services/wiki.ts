import fetch from 'node-fetch';

const WIKI_API_URL = process.env.WIKI_API_URL || 'https://wiki.starbase118.net/wiki/api.php';
const WIKI_BOT_USERNAME = process.env.WIKI_BOT_USERNAME;
const WIKI_BOT_PASSWORD = process.env.WIKI_BOT_PASSWORD;

interface WikiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

interface LoginToken {
  token: string;
  cookies: string[];
}

let sessionCookies: string[] = [];

async function getLoginToken(): Promise<LoginToken | null> {
  try {
    const response = await fetch(`${WIKI_API_URL}?action=query&meta=tokens&type=login&format=json`);
    const data = await response.json() as any;
    const cookies = response.headers.raw()['set-cookie'] || [];

    return {
      token: data.query.tokens.logintoken,
      cookies,
    };
  } catch (error) {
    console.error('Failed to get login token:', error);
    return null;
  }
}

async function login(): Promise<boolean> {
  if (!WIKI_BOT_USERNAME || !WIKI_BOT_PASSWORD) {
    console.log('Wiki credentials not configured - operating in read-only mode');
    return false;
  }

  const tokenData = await getLoginToken();
  if (!tokenData) return false;

  try {
    const params = new URLSearchParams({
      action: 'login',
      lgname: WIKI_BOT_USERNAME,
      lgpassword: WIKI_BOT_PASSWORD,
      lgtoken: tokenData.token,
      format: 'json',
    });

    const response = await fetch(WIKI_API_URL, {
      method: 'POST',
      body: params,
      headers: {
        'Cookie': tokenData.cookies.join('; '),
      },
    });

    const data = await response.json() as any;
    const newCookies = response.headers.raw()['set-cookie'] || [];
    sessionCookies = [...tokenData.cookies, ...newCookies];

    return data.login?.result === 'Success';
  } catch (error) {
    console.error('Wiki login failed:', error);
    return false;
  }
}

export async function fetchWikiPage(pageTitle: string): Promise<WikiResponse> {
  try {
    const params = new URLSearchParams({
      action: 'query',
      titles: pageTitle,
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      format: 'json',
    });

    const response = await fetch(`${WIKI_API_URL}?${params}`);
    const data = await response.json() as any;

    const pages = data.query?.pages;
    if (!pages) {
      return { success: false, error: 'Invalid response from wiki' };
    }

    const pageId = Object.keys(pages)[0];
    if (pageId === '-1') {
      return { success: false, error: 'Page not found' };
    }

    const content = pages[pageId].revisions?.[0]?.slots?.main?.['*'];

    return {
      success: true,
      data: {
        title: pages[pageId].title,
        content,
        pageId: parseInt(pageId),
      },
    };
  } catch (error) {
    console.error('Failed to fetch wiki page:', error);
    return { success: false, error: 'Failed to fetch wiki page' };
  }
}

export async function fetchShipInfo(shipName: string): Promise<WikiResponse> {
  // Try to fetch the ship's main wiki page
  const result = await fetchWikiPage(shipName);

  if (!result.success) {
    // Try with USS prefix
    return fetchWikiPage(`USS ${shipName}`);
  }

  return result;
}

export async function fetchCharacterInfo(characterName: string): Promise<WikiResponse> {
  return fetchWikiPage(characterName);
}

export async function searchWiki(query: string, limit: number = 10): Promise<WikiResponse> {
  try {
    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: query,
      srlimit: limit.toString(),
      format: 'json',
    });

    const response = await fetch(`${WIKI_API_URL}?${params}`);
    const data = await response.json() as any;

    return {
      success: true,
      data: data.query?.search || [],
    };
  } catch (error) {
    console.error('Wiki search failed:', error);
    return { success: false, error: 'Search failed' };
  }
}

export async function fetchPreviousSOTFA(year: number): Promise<WikiResponse> {
  return fetchWikiPage(`State_of_the_Federation_Address/${year}`);
}

export async function fetchCategoryMembers(category: string): Promise<WikiResponse> {
  try {
    const params = new URLSearchParams({
      action: 'query',
      list: 'categorymembers',
      cmtitle: `Category:${category}`,
      cmlimit: '500',
      format: 'json',
    });

    const response = await fetch(`${WIKI_API_URL}?${params}`);
    const data = await response.json() as any;

    return {
      success: true,
      data: data.query?.categorymembers || [],
    };
  } catch (error) {
    console.error('Failed to fetch category:', error);
    return { success: false, error: 'Failed to fetch category' };
  }
}

// Fetch list of active ships
export async function fetchActiveShips(): Promise<WikiResponse> {
  return fetchCategoryMembers('Active PC Vessels');
}

// Fetch list of taskforces
export async function fetchTaskforces(): Promise<WikiResponse> {
  const taskforcePages = [
    'Training_Team',
    'Federation_News_Service',
    'Image_Collective',
    'Chat_Team',
    'Poll_of_the_Week_Team',
    'Advanced_Starship_Design_Bureau',
    'Newsies',
    'Census_Team',
    'Personnel_Team',
  ];

  const results = await Promise.all(taskforcePages.map(page => fetchWikiPage(page)));

  return {
    success: true,
    data: results.filter(r => r.success).map(r => r.data),
  };
}

// Parse wiki templates from content
export function parseTemplate(content: string, templateName: string): Record<string, string>[] {
  const regex = new RegExp(`\\{\\{${templateName}\\s*\\|([^}]+)\\}\\}`, 'gi');
  const matches = content.matchAll(regex);
  const results: Record<string, string>[] = [];

  for (const match of matches) {
    const params = match[1].split('|');
    const parsed: Record<string, string> = {};

    params.forEach((param, index) => {
      if (param.includes('=')) {
        const [key, value] = param.split('=').map(s => s.trim());
        parsed[key] = value;
      } else {
        parsed[`param${index}`] = param.trim();
      }
    });

    results.push(parsed);
  }

  return results;
}
