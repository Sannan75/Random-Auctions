export function normaliseEbayItemUrl(input: string): string {
  try {
    const url = new URL(input);
    const match = url.pathname.match(/\/itm\/(\d+)/);
    if (!match) return input.trim();
    return `${url.origin}/itm/${match[1]}`;
  } catch {
    return input.trim();
  }
}
