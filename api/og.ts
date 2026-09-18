// api/og.ts — Vercel Serverless Function: Open Graph tags for shared media links.
//
// Replaces public/og.php (IONOS/Apache) which cannot run on Vercel (no PHP).
// vercel.json routes social crawlers (WhatsApp, Facebook, Twitter, Telegram,
// Discord, LinkedIn…) on content pages here; human browsers keep the SPA.
// Crawlers don't execute JS, so client-side lib/metaTags.ts never helps them.
//
// Zero dependencies on purpose: Vercel compiles api/ on its own, vite ignores it.
// Test: curl -A "WhatsApp/2.24" https://cmfi-replay.com/watch/<uid>

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'c-m-f-i-replay-f-63xui3';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyBK7nmvzQ1Zmb2iiW2NAvJ-U8b8XloYKto';
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const FALLBACK_SITE_URL = 'https://cmfi-replay.com';

// Minimal structural types (no @vercel/node dependency needed).
interface OgRequest {
    query: Record<string, string | string[] | undefined>;
    headers: Record<string, string | string[] | undefined>;
}
interface OgResponse {
    setHeader(name: string, value: string | string[]): unknown;
    status(code: number): OgResponse;
    send(body: string): unknown;
}

function first(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return value[0] || '';
    return value || '';
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

const FALLBACK_IMAGE_PATH = '/og-fallback.jpg';
const FALLBACK_IMAGE_TYPE = 'image/jpeg';
const FALLBACK_IMAGE_WIDTH = '1200';
const FALLBACK_IMAGE_HEIGHT = '630';
const DEFAULT_DESCRIPTION = 'Plateforme de replay chrétienne — Documentaires, productions et podcasts.';

// Accepts only crawler-fetchable absolute https URLs. Rejects relative paths,
// gs:// bucket paths, SVG files (unsupported by WhatsApp/FB/X/TG) and empties.
// Returns '' when unusable so callers fall back to the JPG fallback.
function toAbsoluteImage(raw: string, siteUrl: string): string {
    const v = (raw || '').trim();
    if (!v) return '';
    if (/^gs:\/\//i.test(v)) return '';
    if (/\.svg(\?.*)?$/i.test(v)) return '';
    if (/^https?:\/\//i.test(v)) {
        // Force https — crawlers prefer secure URLs.
        return v.replace(/^http:\/\//i, 'https://');
    }
    if (v.startsWith('/')) return `${siteUrl}${v}`;
    return '';
}

function mimeFromUrl(url: string, fallback = FALLBACK_IMAGE_TYPE): string {
    const clean = url.split('?')[0].split('#')[0].toLowerCase();
    try {
        const decoded = decodeURIComponent(clean);
        if (decoded.endsWith('.png')) return 'image/png';
        if (decoded.endsWith('.webp')) return 'image/webp';
        if (decoded.endsWith('.gif')) return 'image/gif';
        if (decoded.endsWith('.jpg') || decoded.endsWith('.jpeg')) return 'image/jpeg';
    } catch {
        if (clean.endsWith('.png')) return 'image/png';
        if (clean.endsWith('.webp')) return 'image/webp';
    }
    // Firebase Storage / YouTube thumbs without extension are JPEGs in practice.
    if (/i\.ytimg\.com/i.test(url)) return 'image/jpeg';
    return fallback;
}

// Empty Firestore overviews (incl. legacy "Aucune description" placeholder)
// must never leak into link previews.
function cleanDescription(raw: string, title: string): string {
    const v = (raw || '').trim();
    if (!v || /^aucune description$/i.test(v)) {
        const t = (title || '').trim() && title !== 'CMFI Replay' ? title : '';
        return t ? `Découvrez « ${t} » sur CMFI Replay` : DEFAULT_DESCRIPTION;
    }
    return v;
}

type FirestoreFields = Record<string, any>;

function getField(fields: FirestoreFields | null, name: string, fallback = ''): string {
    if (!fields || !fields[name]) return fallback;
    const f = fields[name];
    if (typeof f.stringValue === 'string') return f.stringValue || fallback;
    if (f.integerValue !== undefined) return String(f.integerValue);
    if (f.doubleValue !== undefined) return String(f.doubleValue);
    if (f.booleanValue !== undefined) return String(f.booleanValue);
    return fallback;
}

async function queryFirestore(collectionId: string, field: string, value: string): Promise<FirestoreFields | null> {
    const url = `${FIRESTORE_BASE_URL}:runQuery?key=${encodeURIComponent(FIREBASE_API_KEY)}`;
    const body = {
        structuredQuery: {
            from: [{ collectionId }],
            where: {
                fieldFilter: {
                    field: { fieldPath: field },
                    op: 'EQUAL',
                    value: { stringValue: value },
                },
            },
            limit: 1,
        },
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        if (!res.ok) return null;
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0 && json[0]?.document?.fields) {
            return json[0].document.fields as FirestoreFields;
        }
        return null;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

export default async function handler(req: OgRequest, res: OgResponse) {
    const type = first(req.query.type).toLowerCase();
    const uid = first(req.query.uid).split('?')[0];
    const seasonUid = first(req.query.season);

    // Live domain comes from the request (reverse proxies set x-forwarded-host).
    // Falls back to production; never hardcode a possibly stale domain.
    const host = first(req.headers['x-forwarded-host'] || req.headers['host']).split(',')[0].trim();
    const siteUrl = host ? `https://${host}` : FALLBACK_SITE_URL;

    let title = 'CMFI Replay';
    let description = DEFAULT_DESCRIPTION;
    // Crawlers reject SVG (WhatsApp/FB/X/TG require JPG/PNG/WebP), so the
    // fallback — and every emitted og:image — must be the JPG below.
    let image = `${siteUrl}${FALLBACK_IMAGE_PATH}`;
    let imageIsFallback = true;
    let ogType = 'website';
    const pageUrl = `${siteUrl}/${type}/${encodeURIComponent(uid)}`;

    if (uid) {
        if (type === 'documentary' || type === 'movie') {
            const data = await queryFirestore('movies', 'uid', uid);
            if (data) {
                title = getField(data, 'title', title);
                description = getField(data, 'overview', description);
                const candidate = toAbsoluteImage(getField(data, 'picture_path', '') || getField(data, 'backdrop_path', ''), siteUrl);
                if (candidate) { image = candidate; imageIsFallback = false; }
                ogType = 'video.movie';
            }
        } else if (type === 'production' || type === 'serie' || type === 'podcast') {
            const data = await queryFirestore('series', 'uid_serie', uid);
            if (data) {
                title = getField(data, 'title_serie', title);
                description = getField(data, 'overview_serie', description);
                const candidate = toAbsoluteImage(getField(data, 'image_path', '') || getField(data, 'back_path', ''), siteUrl);
                if (candidate) { image = candidate; imageIsFallback = false; }
                ogType = 'video.tv_show';
            }
            // Season-aware title: /production/youtube?season=yt_xxx shows the channel name.
            if (seasonUid) {
                const season = await queryFirestore('seasonsSeries', 'uid_season', seasonUid);
                const seasonTitle = season ? getField(season, 'title_season', '') : '';
                if (seasonTitle) {
                    description = `${seasonTitle} — ${description}`;
                }
            }
        } else if (type === 'watch') {
            const movie = await queryFirestore('movies', 'uid', uid);
            if (movie) {
                title = getField(movie, 'title', title);
                description = getField(movie, 'overview', description);
                const candidate = toAbsoluteImage(getField(movie, 'picture_path', '') || getField(movie, 'backdrop_path', ''), siteUrl);
                if (candidate) { image = candidate; imageIsFallback = false; }
                ogType = 'video.movie';
            } else {
                const ep = await queryFirestore('episodesSeries', 'uid_episode', uid);
                if (ep) {
                    const episodeTitle = getField(ep, 'title', '');
                    const serieTitle = getField(ep, 'title_serie', '');
                    if (episodeTitle) {
                        title = serieTitle ? `${episodeTitle} — ${serieTitle}` : episodeTitle;
                    }
                    description = getField(ep, 'overview', '') || getField(ep, 'overviewFr', '') || description;
                    const candidate = toAbsoluteImage(getField(ep, 'picture_path', '') || getField(ep, 'backdrop_path', ''), siteUrl);
                    if (candidate) { image = candidate; imageIsFallback = false; }
                    ogType = 'video.episode';
                }
            }
        }
    }

    description = cleanDescription(description, title);
    const fullTitle = title !== 'CMFI Replay' ? `${title} — CMFI Replay` : title;
    const truncated = description.length > 200 ? `${description.slice(0, 197)}...` : description;
    const imageType = mimeFromUrl(image);

    const t = escapeHtml(fullTitle);
    const d = escapeHtml(truncated);
    const img = escapeHtml(image);
    const imgType = escapeHtml(imageType);
    const url = escapeHtml(pageUrl);

    // NOTE: no hardcoded og:image:width/height for per-video images — posters
    // are portrait while backdrops are landscape; declaring 1200x630 for a
    // portrait PNG gets the image rejected by FB/WhatsApp. Only the fallback
    // (a real 1200x630 JPG) declares dimensions so scrapers can trust them.
    const dimensionTags = imageIsFallback
        ? `\n    <meta property="og:image:width" content="${FALLBACK_IMAGE_WIDTH}">\n    <meta property="og:image:height" content="${FALLBACK_IMAGE_HEIGHT}">`
        : '';

    const html = `<!DOCTYPE html>
<html lang="fr" prefix="og: https://ogp.me/ns#">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t}</title>
    <meta property="og:title" content="${t}">
    <meta property="og:description" content="${d}">
    <meta property="og:image" content="${img}">
    <meta property="og:image:secure_url" content="${img}">
    <meta property="og:image:type" content="${imgType}">
    <meta property="og:image:alt" content="${t}">${dimensionTags}
    <meta property="og:url" content="${url}">
    <meta property="og:type" content="${ogType}">
    <meta property="og:site_name" content="CMFI Replay">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${t}">
    <meta name="twitter:description" content="${d}">
    <meta name="twitter:image" content="${img}">
    <meta name="twitter:image:alt" content="${t}">
    <meta name="description" content="${d}">
    <link rel="canonical" href="${url}">
</head>
<body>
    <h1>${t}</h1>
    <p>${d}</p>
    <img src="${img}" alt="${t}">
    <p><a href="${url}">Voir sur CMFI Replay</a></p>
</body>
</html>`;

    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.status(200).send(html);
}
