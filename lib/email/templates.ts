import type { DigestItemRow } from '@/types';

// ---- Source display helpers ----

const SOURCE_LABELS: Record<string, string> = {
  reddit: 'Reddit',
  hackernews: 'Hacker News',
  twitter: 'Twitter/X',
  exa: 'Exa',
  rss_anthropic: 'Anthropic Blog',
  rss_openai: 'OpenAI Blog',
  rss_deepmind: 'DeepMind Blog',
};

const SOURCE_COLORS: Record<string, string> = {
  reddit: '#ff4500',
  hackernews: '#ff6600',
  twitter: '#1da1f2',
  exa: '#6366f1',
  rss_anthropic: '#d97706',
  rss_openai: '#10a37f',
  rss_deepmind: '#4285f4',
};

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

function sourceColor(source: string): string {
  return SOURCE_COLORS[source] ?? '#6b7280';
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---- Shared layout ----

function layout(title: string, preheader: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .preheader { display: none !important; max-height: 0; overflow: hidden; mso-hide: all; }
  .container { max-width: 640px; margin: 0 auto; padding: 24px 16px; }
  .card { background: #ffffff; border-radius: 8px; padding: 24px; margin-bottom: 16px; }
  .header { text-align: center; padding: 16px 0 8px; }
  .header h1 { margin: 0; font-size: 22px; color: #18181b; }
  .header p { margin: 4px 0 0; font-size: 14px; color: #71717a; }
  .item { border-bottom: 1px solid #f4f4f5; padding: 16px 0; }
  .item:last-child { border-bottom: none; padding-bottom: 0; }
  .item-title a { color: #18181b; text-decoration: none; font-weight: 600; font-size: 15px; line-height: 1.4; }
  .item-title a:hover { color: #2563eb; }
  .item-meta { margin-top: 4px; font-size: 12px; color: #a1a1aa; }
  .source-badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 11px; font-weight: 600; color: #ffffff; }
  .rationale { margin-top: 6px; font-size: 13px; color: #52525b; line-height: 1.4; }
  .comment-angle { margin-top: 8px; padding: 8px 12px; background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 0 4px 4px 0; font-size: 13px; color: #1e40af; line-height: 1.4; }
  .score-bar { display: inline-block; width: 48px; height: 6px; background: #e4e4e7; border-radius: 3px; vertical-align: middle; margin-left: 6px; }
  .score-fill { display: block; height: 100%; border-radius: 3px; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #a1a1aa; margin: 0 0 12px; padding-top: 8px; }
  .footer { text-align: center; padding: 16px 0; font-size: 12px; color: #a1a1aa; }
  .footer a { color: #71717a; }
</style>
</head>
<body>
<div class="preheader">${escapeHtml(preheader)}</div>
<div class="container">
${body}
</div>
</body>
</html>`;
}

// ---- Item renderers ----

function renderScoreBar(value: number, color: string): string {
  const pct = Math.round((value / 10) * 100);
  return `<span class="score-bar"><span class="score-fill" style="width:${pct}%;background:${color};"></span></span>`;
}

function renderItem(item: DigestItemRow, includeCommentAngle: boolean): string {
  const badge = `<span class="source-badge" style="background:${sourceColor(item.source)};">${escapeHtml(sourceLabel(item.source))}</span>`;
  const meta: string[] = [];
  if (item.author) meta.push(escapeHtml(item.author));
  if (item.source_score !== null) meta.push(`${item.source_score} pts`);
  if (item.comment_count !== null) meta.push(`${item.comment_count} comments`);

  let html = `<div class="item">
  <div class="item-title">${badge} <a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a></div>
  <div class="item-meta">${meta.join(' &middot; ')}</div>
  <div class="rationale">${escapeHtml(item.scoring_rationale)}</div>`;

  if (includeCommentAngle && item.comment_angle) {
    html += `\n  <div class="comment-angle"><strong>Comment angle:</strong> ${escapeHtml(item.comment_angle)}</div>`;
  }

  html += '\n</div>';
  return html;
}

// ---- Public template (for subscribers) ----

export function publicDigestHtml(
  date: string,
  items: DigestItemRow[],
): string {
  const filtered = items.filter((i) => i.author !== 'ClaudeAI-mod-bot');

  const top = filtered
    .filter((i) => i.public_interest >= 6)
    .sort((a, b) => b.public_interest - a.public_interest)
    .slice(0, 20);

  const highlights = top.filter((i) => i.public_interest >= 8).slice(0, 10);
  const notable = top.filter((i) => i.public_interest >= 6 && i.public_interest < 8);

  let body = `<div class="header">
  <h1>AI Morning Digest</h1>
  <p>${escapeHtml(date)} &middot; ${top.length} stories</p>
</div>
<div class="card">`;

  if (highlights.length > 0) {
    body += `\n  <div class="section-title">Highlights ${renderScoreBar(9, '#eab308')}</div>`;
    body += highlights.map((i) => renderItem(i, false)).join('\n');
  }

  if (notable.length > 0) {
    body += `\n  <div class="section-title" style="margin-top:16px;">Notable ${renderScoreBar(7, '#6366f1')}</div>`;
    body += notable.map((i) => renderItem(i, false)).join('\n');
  }

  body += '\n</div>';
  body += `\n<div class="footer">You received this because you subscribed to AI Morning Digest.<br><a href="{{unsubscribe_url}}">Unsubscribe</a></div>`;

  const preheader =
    highlights.length > 0
      ? highlights
          .slice(0, 3)
          .map((i) => i.title)
          .join(' | ')
      : `${top.length} AI stories for ${date}`;

  return layout(`AI Morning Digest - ${date}`, preheader, body);
}

// ---- Personal template (for you, with comment angles) ----

export function personalDigestHtml(
  date: string,
  items: DigestItemRow[],
): string {
  const filtered = items.filter((i) => i.author !== 'ClaudeAI-mod-bot');

  const personal = filtered
    .filter((i) => i.personal_relevance >= 7)
    .sort((a, b) => b.personal_relevance - a.personal_relevance)
    .slice(0, 20);

  const publicTop = filtered
    .filter((i) => i.public_interest >= 7 && i.personal_relevance < 7)
    .sort((a, b) => b.public_interest - a.public_interest)
    .slice(0, 10);

  let body = `<div class="header">
  <h1>Your AI Digest</h1>
  <p>${escapeHtml(date)} &middot; ${personal.length} personal + ${publicTop.length} public</p>
</div>`;

  if (personal.length > 0) {
    body += `\n<div class="card">
  <div class="section-title">For You ${renderScoreBar(9, '#ef4444')}</div>`;
    body += personal.map((i) => renderItem(i, true)).join('\n');
    body += '\n</div>';
  }

  if (publicTop.length > 0) {
    body += `\n<div class="card">
  <div class="section-title">Public Highlights ${renderScoreBar(8, '#eab308')}</div>`;
    body += publicTop.map((i) => renderItem(i, false)).join('\n');
    body += '\n</div>';
  }

  const stats = items.length;
  body += `\n<div class="footer">Scanned ${stats} items across all sources.</div>`;

  const preheader =
    personal.length > 0
      ? `${personal.length} items matched your profile`
      : `${publicTop.length} trending AI stories`;

  return layout(`Your AI Digest - ${date}`, preheader, body);
}
