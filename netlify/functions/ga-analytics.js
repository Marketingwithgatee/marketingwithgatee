// Netlify serverless function — proxies Google Analytics Data API v1beta
// Required env vars (set in Netlify → Site settings → Environment variables):
//   GA_PROPERTY_ID     — numeric GA4 property ID, e.g. 15121304840
//   GA_CLIENT_EMAIL    — service account email, e.g. name@project.iam.gserviceaccount.com
//   GA_PRIVATE_KEY     — service account private key (the full -----BEGIN RSA PRIVATE KEY----- block)

const crypto = require('crypto')

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Normalise a service-account private key that may have been mangled when
// pasted into an env var (escaped newlines, wrapping quotes, base64, CRLF).
// Rebuilds the PEM from scratch so stray whitespace/wrapping never matters.
function normalizePrivateKey(raw) {
  let k = String(raw).trim()
  // Strip wrapping quotes (possibly added when pasting into a shell/env UI)
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).trim()
  }
  // If it doesn't look like a PEM, assume it's base64-encoded PEM and decode it.
  // (strip whitespace first — env UIs sometimes inject line breaks)
  if (!k.includes('BEGIN')) {
    try {
      const decoded = Buffer.from(k.replace(/\s+/g, ''), 'base64').toString('utf8')
      if (decoded.includes('BEGIN')) k = decoded
    } catch (_) {}
  }
  // Convert escaped newlines to real ones, normalise CRLF
  k = k.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim()

  // Rebuild the PEM: extract header label + the base64 body, re-wrap at 64 cols.
  const m = k.match(/-----BEGIN ([^-]+)-----([\s\S]*?)-----END \1-----/)
  if (m) {
    const label = m[1].trim()
    const body = m[2].replace(/[^A-Za-z0-9+/=]/g, '') // keep only base64 chars
    const wrapped = body.match(/.{1,64}/g).join('\n')
    return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----\n`
  }
  return k + '\n'
}

async function getAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })))
  const payload = base64url(Buffer.from(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })))
  const signingInput = `${header}.${payload}`
  const key = crypto.createPrivateKey({ key: normalizePrivateKey(privateKey), format: 'pem' })
  const sig = crypto.sign('RSA-SHA256', Buffer.from(signingInput), key)
  const jwt = `${signingInput}.${base64url(sig)}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) throw new Error(`Token error: ${JSON.stringify(tokenData)}`)
  return tokenData.access_token
}

async function runReport(accessToken, propertyId, body) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  if (!res.ok) throw new Error(`GA API error: ${res.status} ${await res.text()}`)
  return res.json()
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  const { GA_PROPERTY_ID, GA_CLIENT_EMAIL, GA_PRIVATE_KEY, GA_PRIVATE_KEY_BASE64 } = process.env
  const privateKey = GA_PRIVATE_KEY_BASE64 || GA_PRIVATE_KEY

  // Safe diagnostics: /.netlify/functions/ga-analytics?debug=1
  // Reveals structure only — never the key material itself.
  if (event.queryStringParameters && event.queryStringParameters.debug) {
    const norm = privateKey ? normalizePrivateKey(privateKey) : ''
    let parseOk = false, parseErr = null
    try { crypto.createPrivateKey({ key: norm, format: 'pem' }); parseOk = true }
    catch (e) { parseErr = e.message }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        hasPropertyId: !!GA_PROPERTY_ID,
        hasClientEmail: !!GA_CLIENT_EMAIL,
        clientEmailEndsWith: GA_CLIENT_EMAIL ? GA_CLIENT_EMAIL.slice(-25) : null,
        usingVar: GA_PRIVATE_KEY_BASE64 ? 'GA_PRIVATE_KEY_BASE64' : (GA_PRIVATE_KEY ? 'GA_PRIVATE_KEY' : 'none'),
        rawLength: privateKey ? privateKey.length : 0,
        rawHasBEGIN: privateKey ? privateKey.includes('BEGIN') : false,
        rawFirst15: privateKey ? privateKey.slice(0, 15) : null,
        normHasBEGIN: norm.includes('BEGIN'),
        normFirstLine: norm.split('\n')[0] || null,
        normLineCount: norm.split('\n').length,
        normBodyChars: norm.replace(/-----[^-]+-----/g, '').replace(/\s/g, '').length,
        parseOk,
        parseErr,
      }, null, 2),
    }
  }

  if (!GA_PROPERTY_ID || !GA_CLIENT_EMAIL || !privateKey) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ error: 'GA service account not configured. Add GA_PROPERTY_ID, GA_CLIENT_EMAIL and GA_PRIVATE_KEY to Netlify environment variables.' }),
    }
  }

  try {
    const token = await getAccessToken(GA_CLIENT_EMAIL, privateKey)

    // Run all reports in parallel
    const [
      views28d, viewsByDay, deviceBreakdown, topPages, last7d, prev7d,
      channels, countries, newReturning, hourly,
    ] = await Promise.all([
      // Total engagement metrics last 28 days
      runReport(token, GA_PROPERTY_ID, {
        dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
          { name: 'engagementRate' },
          { name: 'screenPageViewsPerSession' },
          { name: 'newUsers' },
        ],
      }),
      // Daily page views last 28 days (for the chart)
      runReport(token, GA_PROPERTY_ID, {
        dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
      // Device category breakdown
      runReport(token, GA_PROPERTY_ID, {
        dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'sessions' }],
      }),
      // Top pages
      runReport(token, GA_PROPERTY_ID, {
        dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 6,
      }),
      // Last 7 days
      runReport(token, GA_PROPERTY_ID, {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }, { name: 'activeUsers' }],
      }),
      // Previous 7 days (days 8-14 ago) for week-over-week trend
      runReport(token, GA_PROPERTY_ID, {
        dateRanges: [{ startDate: '14daysAgo', endDate: '8daysAgo' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }, { name: 'activeUsers' }],
      }),
      // Traffic sources (channel grouping)
      runReport(token, GA_PROPERTY_ID, {
        dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'sessionDefaultChannelGroup' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 6,
      }),
      // Geography
      runReport(token, GA_PROPERTY_ID, {
        dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 6,
      }),
      // New vs returning visitors
      runReport(token, GA_PROPERTY_ID, {
        dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'newVsReturning' }],
        metrics: [{ name: 'activeUsers' }],
      }),
      // Visits by hour of day (0-23)
      runReport(token, GA_PROPERTY_ID, {
        dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'hour' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'hour' } }],
      }),
    ])

    const toMetric = (report, idx) => Number(report.rows?.[0]?.metricValues?.[idx]?.value || 0)

    // Build 24-hour array (fill gaps with 0)
    const hourMap = {}
    ;(hourly.rows || []).forEach((r) => { hourMap[Number(r.dimensionValues[0].value)] = Number(r.metricValues[0].value) })
    const hourlySessions = Array.from({ length: 24 }, (_, h) => ({ hour: h, sessions: hourMap[h] || 0 }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        summary: {
          pageViews28d: toMetric(views28d, 0),
          sessions28d: toMetric(views28d, 1),
          activeUsers28d: toMetric(views28d, 2),
          avgSessionDuration: Math.round(toMetric(views28d, 3)),
          bounceRate: (toMetric(views28d, 4) * 100).toFixed(1),
          engagementRate: (toMetric(views28d, 5) * 100).toFixed(1),
          viewsPerSession: toMetric(views28d, 6).toFixed(1),
          newUsers28d: toMetric(views28d, 7),
          pageViews7d: toMetric(last7d, 0),
          sessions7d: toMetric(last7d, 1),
          activeUsers7d: toMetric(last7d, 2),
          pageViewsPrev7d: toMetric(prev7d, 0),
          sessionsPrev7d: toMetric(prev7d, 1),
          activeUsersPrev7d: toMetric(prev7d, 2),
        },
        dailyViews: (viewsByDay.rows || []).map((r) => ({
          date: r.dimensionValues[0].value,
          views: Number(r.metricValues[0].value),
          sessions: Number(r.metricValues[1].value),
        })),
        devices: (deviceBreakdown.rows || []).map((r) => ({
          device: r.dimensionValues[0].value,
          sessions: Number(r.metricValues[0].value),
        })),
        topPages: (topPages.rows || []).map((r) => ({
          path: r.dimensionValues[0].value,
          views: Number(r.metricValues[0].value),
        })),
        channels: (channels.rows || []).map((r) => ({
          channel: r.dimensionValues[0].value,
          sessions: Number(r.metricValues[0].value),
        })),
        countries: (countries.rows || []).map((r) => ({
          country: r.dimensionValues[0].value,
          users: Number(r.metricValues[0].value),
        })),
        newReturning: (newReturning.rows || []).map((r) => ({
          type: r.dimensionValues[0].value,
          users: Number(r.metricValues[0].value),
        })),
        hourlySessions,
      }),
    }
  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ error: err.message }),
    }
  }
}
