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
function normalizePrivateKey(raw) {
  let k = raw.trim()
  // If it doesn't look like a PEM, assume it's base64-encoded PEM and decode it
  if (!k.includes('BEGIN')) {
    try {
      const decoded = Buffer.from(k, 'base64').toString('utf8')
      if (decoded.includes('BEGIN')) k = decoded
    } catch (_) {}
  }
  // Strip wrapping quotes
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1)
  }
  // Convert escaped newlines to real ones, normalise CRLF
  k = k.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n')
  return k.trim() + '\n'
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
    const [views28d, viewsByDay, deviceBreakdown, topPages, realtimeRes] = await Promise.all([
      // Total views + sessions last 28 days
      runReport(token, GA_PROPERTY_ID, {
        dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'activeUsers' },
          { name: 'averageSessionDuration' },
          { name: 'bounceRate' },
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
        limit: 5,
      }),
      // Last 7 days for comparison
      runReport(token, GA_PROPERTY_ID, {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }, { name: 'activeUsers' }],
      }),
    ])

    const toMetric = (report, idx) => Number(report.rows?.[0]?.metricValues?.[idx]?.value || 0)

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
          pageViews7d: toMetric(realtimeRes, 0),
          sessions7d: toMetric(realtimeRes, 1),
          activeUsers7d: toMetric(realtimeRes, 2),
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
