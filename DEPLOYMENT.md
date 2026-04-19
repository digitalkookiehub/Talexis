# Talexis Deployment Guide — Step by Step

## Prerequisites
- A Linux server (Ubuntu 22.04 recommended) with at least 2GB RAM
- A domain name (e.g., talexis.in) pointing to your server's IP
- SSH access to the server

---

## Step 1: Set Up Your Server

### Option A: DigitalOcean ($12/month)
1. Create a Droplet: Ubuntu 22.04, 2GB RAM, 1 CPU
2. Note the IP address
3. SSH in: `ssh root@YOUR_IP`

### Option B: AWS EC2
1. Launch t3.small instance with Ubuntu 22.04 AMI
2. Open ports 80, 443, 22 in security group
3. SSH in with your key pair

### Option C: Railway/Render (easiest)
1. Connect your GitHub repo
2. Railway auto-detects Docker Compose
3. Skip to Step 6

---

## Step 2: Install Docker on Server

```bash
# SSH into your server
ssh root@YOUR_SERVER_IP

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
apt install -y docker-compose-plugin

# Verify
docker --version
docker compose version
```

---

## Step 3: Upload Code to Server

```bash
# Option A: Git clone (recommended)
git clone https://github.com/YOUR_USERNAME/talexis.git
cd talexis

# Option B: SCP from your machine
scp -r D:\Saas_builder\Talexis root@YOUR_IP:/root/talexis
ssh root@YOUR_IP
cd talexis
```

---

## Step 4: Configure Environment

```bash
# Copy the production template
cp .env.production .env

# Edit with your values
nano .env
```

### Required changes in .env:
```
DB_PASSWORD=your_strong_db_password
SECRET_KEY=your_random_secret_key
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=["https://yourdomain.com"]
VITE_API_URL=https://yourdomain.com
OPENAI_API_KEY=sk-your-key      # If using OpenAI
ADMIN_EMAIL=your@email.com
```

### Generate a secret key:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

---

## Step 5: Build and Launch

```bash
# Build all containers
docker compose build

# Start everything
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f backend
```

### First-time setup — run database seed:
```bash
docker compose exec backend python seed.py
```

---

## Step 6: Set Up Domain + SSL (HTTPS)

### Point your domain to your server:
- Go to your domain registrar (GoDaddy, Namecheap, etc.)
- Add an A record: `@` → `YOUR_SERVER_IP`
- Add an A record: `www` → `YOUR_SERVER_IP`
- Wait 5-10 minutes for DNS propagation

### Install SSL with Certbot:
```bash
# Install certbot
apt install -y certbot python3-certbot-nginx

# Stop the containers temporarily
docker compose down

# Get SSL certificate
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates
mkdir -p ssl
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ssl/

# Restart
docker compose up -d
```

### Auto-renew SSL:
```bash
# Add to crontab
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet") | crontab -
```

---

## Step 7: Verify Everything Works

```bash
# Check all services are running
docker compose ps

# Test backend
curl http://localhost/api/v1/health

# Test frontend
curl http://localhost

# Check logs for errors
docker compose logs backend --tail 50
docker compose logs frontend --tail 50
```

### Visit in browser:
- `https://yourdomain.com` — Homepage should load
- `https://yourdomain.com/pricing` — Pricing page
- `https://yourdomain.com/login` — Admin login
- `https://yourdomain.com/api/v1/docs` — API docs

---

## Step 8: Set Up External Services

### Dodo Payments:
1. Sign up at https://dodopayments.com
2. Create products: Pro Candidate (₹399), Company Starter (₹7,999), Company Growth (₹24,999)
3. Copy API key → set `DODO_PAYMENTS_API_KEY` in .env
4. Set webhook URL in Dodo dashboard: `https://yourdomain.com/api/v1/payments/webhook`
5. Set `DODO_PAYMENTS_ENV=live_mode`
6. Restart: `docker compose restart backend`

### Email (Gmail SMTP):
1. Enable 2FA on your Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Set in .env:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   ```
4. Restart: `docker compose restart backend`

### OpenAI (for AI evaluation):
1. Get API key from https://platform.openai.com/api-keys
2. Set `OPENAI_API_KEY=sk-your-key` in .env
3. Restart: `docker compose restart backend`

---

## Common Operations

### Update code:
```bash
cd talexis
git pull origin main
docker compose build
docker compose up -d
```

### View logs:
```bash
docker compose logs -f           # All services
docker compose logs -f backend   # Backend only
docker compose logs -f frontend  # Frontend only
```

### Database backup:
```bash
docker compose exec db pg_dump -U talexis_user talexis > backup_$(date +%Y%m%d).sql
```

### Database restore:
```bash
cat backup_20260419.sql | docker compose exec -T db psql -U talexis_user talexis
```

### Reset database:
```bash
docker compose down
docker volume rm talexis_postgres_data
docker compose up -d
docker compose exec backend python seed.py
```

### Scale for more traffic:
```bash
# Add more backend workers
docker compose up -d --scale backend=3
```

---

## Monitoring

### Check server resources:
```bash
htop                    # CPU & memory
df -h                   # Disk space
docker stats            # Container resource usage
```

### Check application health:
```bash
curl https://yourdomain.com/api/v1/health
```

---

## Cost Estimate

| Service | Provider | Monthly Cost |
|---------|----------|-------------|
| Server (2GB) | DigitalOcean | $12 |
| Domain | Any registrar | ~₹800/year |
| SSL | Let's Encrypt | Free |
| OpenAI API | OpenAI | ~$5-20 (usage-based) |
| Email | Gmail SMTP | Free |
| **Total** | | **~$17-32/month** |

---

## Troubleshooting

### Container won't start:
```bash
docker compose logs backend  # Check error
docker compose down && docker compose up -d  # Restart all
```

### Database connection error:
```bash
docker compose exec db psql -U talexis_user talexis  # Test DB access
```

### Frontend shows blank page:
```bash
docker compose logs frontend  # Check nginx
docker compose build frontend && docker compose up -d frontend  # Rebuild
```

### SSL certificate issues:
```bash
certbot certificates  # Check cert status
certbot renew --force-renewal  # Force renew
```
