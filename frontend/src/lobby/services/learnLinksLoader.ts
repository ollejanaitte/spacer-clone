export type LearnLink = {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  targetAudience: string[];
};

export type LearnLinksData = {
  version: string;
  links: LearnLink[];
};

let cachedLinks: LearnLinksData | null = null;

export async function loadLearnLinks(): Promise<LearnLinksData> {
  if (cachedLinks) return cachedLinks;

  const response = await fetch("/locales/learn_links.json");
  if (!response.ok) {
    throw new Error(`Failed to load learn links: ${response.status}`);
  }
  const data = (await response.json()) as LearnLinksData;
  cachedLinks = data;
  return data;
}

export function clearLearnLinksCache(): void {
  cachedLinks = null;
}
