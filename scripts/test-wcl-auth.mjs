const clientId = process.env.WCL_CLIENT_ID;
const clientSecret = process.env.WCL_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('Missing WCL_CLIENT_ID or WCL_CLIENT_SECRET');
  process.exit(1);
}

const response = await fetch('https://www.warcraftlogs.com/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  }),
});

if (!response.ok) {
  console.error('Failed to authenticate with Warcraft Logs');
  console.error(await response.text());
  process.exit(1);
}

const data = await response.json();
console.log(JSON.stringify({
  token_type: data.token_type,
  expires_in: data.expires_in,
  scope: data.scope || null,
  access_token_preview: `${String(data.access_token).slice(0, 8)}...`,
}, null, 2));
