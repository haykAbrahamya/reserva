/**
 * A download name from what the visitor typed: ("price-list", "Anna Beauty")
 * → "price-list-anna-beauty.png". A name with no Latin letters or digits (most
 * Armenian ones) keeps just the prefix — a readable "price-list.png" beats a
 * file named in percent-escapes.
 */
export function fileNameFor(prefix: string, title: string, extension = 'png'): string {
  const slug = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return `${slug ? `${prefix}-${slug}` : prefix}.${extension}`
}
