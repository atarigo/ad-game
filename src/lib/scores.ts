export interface ScoreRecord {
  score: number;
  details: Record<string, number>;
  finishedAt: string;
}

const MAX_RECORDS = 10;

function key(gameSlug: string): string {
  return `scores:${gameSlug}`;
}

export function saveScore(gameSlug: string, record: ScoreRecord): void {
  const list = getScores(gameSlug);
  list.push(record);
  list.sort((a, b) => b.score - a.score);
  if (list.length > MAX_RECORDS) list.length = MAX_RECORDS;
  localStorage.setItem(key(gameSlug), JSON.stringify(list));
}

export function getScores(gameSlug: string): ScoreRecord[] {
  try {
    const raw = localStorage.getItem(key(gameSlug));
    if (!raw) return [];
    return JSON.parse(raw) as ScoreRecord[];
  } catch {
    return [];
  }
}

export function getAllGames(): string[] {
  const slugs: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("scores:")) {
      slugs.push(k.slice(7));
    }
  }
  return slugs;
}

export const gameNames: Record<string, string> = {
  "survival-loop": "末日生存",
};

export const detailLabels: Record<string, Record<string, string>> = {
  "survival-loop": {
    trees: "🌲 砍樹",
    bears: "🐻 殺熊",
    coins: "💰 金幣",
  },
};
