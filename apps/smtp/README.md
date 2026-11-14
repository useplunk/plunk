# Plunk SMTP Relay Server

A production-ready SMTP relay server that accepts emails via SMTP protocol and forwards them to the Plunk API's
`/v1/send` endpoint.

## Features

- **Secure Authentication**: API key-based authentication using project secrets
- **Domain Verification**: Validates sender domains are verified before accepting emails
- **TLS Support**: Supports both implicit TLS (port 465) and STARTTLS (port 587)
- **Flexible Certificate Handling**: Works with Traefik's acme.json or standard PEM files
- **Email Parsing**: Full email parsing with support for HTML and plain text
- **Rate Limiting**: Configurable recipient limits per email
- **Production Ready**: Built with TypeScript, error handling, and logging

## Architecture

```
SMTP Client → SMTP Server → Email Parser → API /v1/send → AWS SES
```

The SMTP server acts as a relay:

1. Accepts SMTP connections with authentication
2. Validates sender domains against the database
3. Parses incoming emails
4. Forwards to the Plunk API
5. Returns success/error to the SMTP client

## Environment Variables

| Variable          | Default                 | Description                                                                    |
|-------------------|-------------------------|--------------------------------------------------------------------------------|
| `API_URI`         | `http://localhost:3000` | Plunk API base URL                                                             |
| `SMTP_DOMAIN`     | *(empty)*               | SMTP domain - required when using Traefik acme.json with multiple certificates |
| `PORT_SECURE`     | `465`                   | SMTPS port (implicit TLS)                                                      |
| `PORT_SUBMISSION` | `587`                   | SMTP submission port (STARTTLS)                                                |
| `MAX_RECIPIENTS`  | `5`                     | Maximum recipients per email                                                   |
| `CERT_PATH`       | `/certs`                | Path to certificate files                                                      |
| `ACME_JSON_PATH`  | `/certs/acme.json`      | Path to Traefik acme.json file                                                 |

See `.env.self-host.example` in the repository root for full configuration options.

## Development

### Prerequisites

- Node.js 20+
- PostgreSQL database (running via `yarn services:up`)
- Redis (running via `yarn services:up`)

### Running Locally

```bash
# Install dependencies
yarn install

# Start development server (with hot reload)
yarn workspace smtp dev
```

The SMTP server will start on ports 465 and 587. For local testing without TLS certificates, it will run in plaintext
mode on port 587.

### Testing with Telnet

```bash
# Connect to SMTP server
telnet localhost 587

# Example SMTP session:
EHLO localhost
AUTH LOGIN
cGx1bms=           # base64("plunk")
<your-api-key>     # your project secret (plain text)
MAIL FROM:<sender@yourdomain.com>
RCPT TO:<recipient@example.com>
DATA
Subject: Test Email
From: sender@yourdomain.com
To: recipient@example.com

This is a test email.
.
QUIT
```

### Testing with Mail Clients

Configure your email client with:

- **SMTP Server**: `localhost` (or your domain in production)
- **Port**: 587 (STARTTLS) or 465 (SSL/TLS)
- **Username**: `plunk`
- **Password**: Your Plunk API key (project secret)
- **From Address**: Must use a verified domain in your Plunk project

## Production Deployment

### TLS Certificate Support

The SMTP server supports TLS certificates through two methods:

1. **Traefik acme.json** (recommended for Traefik/Dokploy users)
    - Mount your Traefik acme.json file to `/certs/acme.json`
    - Set `SMTP_DOMAIN` environment variable to select the correct certificate
    - The server will automatically use the certificate for your domain

2. **PEM Files** (standard certificate files)
    - Mount `privkey.pem` and `fullchain.pem` to `/certs/`
    - These are standard Let's Encrypt/Certbot filenames
    - `SMTP_DOMAIN` is optional when using PEM files

If no certificates are mounted, the server will run without TLS (not recommended for production).

### Docker Deployment

The SMTP server is included in the main Plunk Docker image:

**Option 1: With Traefik acme.json**

```bash
docker run -d \
  -p 465:465 \
  -p 587:587 \
  -e SERVICE=all \
  -e API_URI=https://api.yourdomain.com \
  -e SMTP_DOMAIN=smtp.yourdomain.com \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -v /path/to/acme.json:/certs/acme.json:ro \
  plunk:latest
```

**Option 2: With PEM files**

```bash
docker run -d \
  -p 465:465 \
  -p 587:587 \
  -e SERVICE=all \
  -e API_URI=https://api.yourdomain.com \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  -v /path/to/certs:/certs:ro \
  plunk:latest
```

Mount the directory holding `privkey.pem` and `fullchain.pem`, not the files: a single-file mount keeps the old file
when a renewal replaces it. For certbot, copy the files there from a deploy hook (see the self-hosting docs), since
certbot's `live/` files are symlinks into directories only root can read.

**Option 3: Without TLS (Development Only)**

```bash
docker run -d \
  -p 587:587 \
  -e SERVICE=all \
  -e API_URI=http://api.yourdomain.com \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  plunk:latest
```

**⚠️ Running without TLS is not recommended for production!**

### DNS Configuration

Add an A record pointing to your server:

```
smtp.example.com.  A  1.2.3.4
```

Optionally, add MX records if receiving email:

```
example.com.  MX 10  smtp.example.com.
```

## Security

### Authentication

- Username must be `plunk` (case-insensitive)
- Password is the project secret (API key)
- Invalid credentials are rejected with proper SMTP error codes

### Domain Validation

- Sender domain must be added to the project
- Sender domain must be verified (DNS records validated)
- Unverified domains are rejected with clear error messages

### Rate Limiting

- Maximum 5 recipients per email by default (configurable)
- 10MB maximum message size
- Proper error handling for oversized messages

## Monitoring

The SMTP server logs all operations using `signale`:

```
✅ SMTP server listening on port 465 (secure=true)
✅ SMTP server listening on port 587 (secure=false)
✅ Email relayed: sender@domain.com → recipient@example.com
❌ Sender domain is not verified or not associated with your account
```

Use PM2 or similar process managers to monitor the service in production.

## Troubleshooting

### TLS Certificate Issues

If TLS is not working:

1. Verify certificates are mounted correctly:
   ```bash
   docker exec <container> ls -la /certs/
   ```
2. Check certificate permissions (should be readable)
3. Review logs for certificate loading errors:
   ```bash
   docker logs <container> 2>&1 | grep -i "cert"
   ```
4. If using Traefik acme.json, ensure `SMTP_DOMAIN` is set correctly
5. If using PEM files, ensure both `privkey.pem` and `fullchain.pem` are present

### Connection Refused

If clients cannot connect:

1. Verify ports 465 and 587 are exposed and not blocked by firewall
2. Check if the service is running: `pm2 list`
3. Review logs: `pm2 logs smtp`

### Authentication Failures

If authentication fails:

1. Verify username is exactly `plunk`
2. Verify password is the project secret, not public key
3. Check database connectivity

### Domain Verification Errors

If emails are rejected with domain errors:

1. Verify domain is added to your project
2. Check domain verification status in Plunk dashboard
3. Ensure DNS records are properly configured

## Performance Considerations

The SMTP server is designed for high-scale email sending:

- **Async Processing**: All database and API calls are non-blocking
- **Connection Pooling**: Prisma handles database connection pooling
- **Minimal Memory**: Streams email data without buffering entire messages
- **Fast Authentication**: Single database query per connection

For high-volume sending:

- Deploy multiple SMTP server instances behind a load balancer
- Use connection pooling in your SMTP clients
- Monitor API rate limits and adjust accordingly

## API Integration

The SMTP server forwards emails to the API endpoint:

```
POST /v1/send
Authorization: Bearer {project_secret}

{
  "from": "sender@domain.com",
  "name": "Sender Name",
  "to": ["recipient@example.com"],
  "subject": "Email Subject",
  "body": "<html>...</html>"
}
```

The API response is translated to SMTP status codes:

- `200 OK` → `250 Message accepted`
- `4xx/5xx` → `554 Transaction failed`

## Contributing

When modifying the SMTP server:

1. Follow the existing code patterns
2. Add proper error handling
3. Update TypeScript types
4. Test with real SMTP clients
5. Update this README if adding features

## License

Part of the Plunk project - see repository root for license information.
