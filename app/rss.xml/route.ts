import { getRecentPublicItems } from '@/lib/supabase/queries';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc2822(iso: string): string {
  return new Date(iso).toUTCString();
}

export async function GET() {
  const items = await getRecentPublicItems(30);

  const itemsXml = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <description>${escapeXml(item.public_rationale ?? item.scoring_rationale)}</description>
      <pubDate>${toRfc2822(item.published_at)}</pubDate>
      <guid isPermaLink="true">${escapeXml(item.url)}</guid>
    </item>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>AI Morning Digest</title>
    <link>https://digest.fieldnotes-ai.com</link>
    <description>Daily AI news scored and curated by Claude. Top stories from Reddit, Hacker News, X, and tech blogs.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
