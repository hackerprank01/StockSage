# StockSage Deployment Guide

## Prerequisites

### Required
- Node.js 20 or higher
- OpenAI API key with GPT-4o access
- 2GB RAM minimum
- 10GB disk space

### Optional but Recommended
- Gmail account with App Password (for email notifications)
- Twilio account (for SMS notifications)
- Domain name with SSL certificate
- Reverse proxy (NGINX or similar)

## Environment Setup

### 1. Create .env file

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Required
NODE_ENV=production
PORT=5000
OPENAI_API_KEY=sk-proj-your-actual-key-here
OPENAI_MODEL=gpt-4o

# Optional - Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
EMAIL_FROM=StockSage AI <noreply@stocksage.ai>

# Optional - SMS
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890

# Optional - Customization
COMPANY_NAME=Your Company Name
COMPANY_ADDRESS=Your Company Address
```

### 2. Gmail App Password Setup

1. Enable 2-factor authentication on your Gmail account
2. Go to https://myaccount.google.com/apppasswords
3. Generate an app password for "Mail"
4. Use this password in SMTP_PASS (not your regular password)

### 3. Twilio Setup

1. Sign up at https://www.twilio.com
2. Get Account SID and Auth Token from dashboard
3. Purchase a phone number for sending SMS
4. Add credentials to .env

## Deployment Options

### Option 1: Direct Node.js Deployment

#### Development
```bash
npm install
npm run dev
```

#### Production
```bash
npm install --production
npm run build
npm start
```

**Process Manager (Recommended):**
```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/index.js --name stocksage

# Auto-restart on reboot
pm2 startup
pm2 save

# Monitor
pm2 monit
pm2 logs stocksage

# Restart
pm2 restart stocksage

# Stop
pm2 stop stocksage
```

### Option 2: Docker Deployment

#### Build and Run
```bash
# Build image
docker build -t stocksage:latest .

# Run container
docker run -d \
  --name stocksage \
  -p 5000:5000 \
  --env-file .env \
  -v $(pwd)/generated-pdfs:/app/generated-pdfs \
  -v $(pwd)/data:/app/data \
  stocksage:latest

# View logs
docker logs -f stocksage

# Stop
docker stop stocksage
```

#### Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

### Option 3: Cloud Deployment

#### Heroku
```bash
# Install Heroku CLI
# Login
heroku login

# Create app
heroku create your-stocksage-app

# Add buildpack
heroku buildpacks:set heroku/nodejs

# Set environment variables
heroku config:set OPENAI_API_KEY=your-key
heroku config:set OPENAI_MODEL=gpt-4o
# ... add all other env vars

# Deploy
git push heroku main

# View logs
heroku logs --tail
```

#### DigitalOcean App Platform
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Configure build settings:
   - Build Command: `npm run build`
   - Run Command: `npm start`
4. Deploy

#### AWS EC2
```bash
# SSH into instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone https://github.com/your-username/StockSage.git
cd StockSage

# Install dependencies
npm install --production

# Setup .env file
nano .env
# Add your environment variables

# Build
npm run build

# Install PM2
sudo npm install -g pm2

# Start application
pm2 start dist/index.js --name stocksage
pm2 startup
pm2 save

# Setup NGINX reverse proxy (optional)
sudo apt-get install nginx
sudo nano /etc/nginx/sites-available/stocksage
```

NGINX configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /ws {
        proxy_pass http://localhost:5000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

## Database Setup

### Development
SQLite database is created automatically on first run.

### Production
For high-traffic scenarios, consider migrating to PostgreSQL:

1. Update `drizzle.config.ts`:
```typescript
export default {
  schema: './shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
}
```

2. Update dependencies:
```bash
npm install pg
npm install --save-dev @types/pg
```

3. Update storage.ts to use PostgreSQL driver

## Monitoring & Logging

### PM2 Monitoring
```bash
pm2 monit
pm2 logs stocksage --lines 100
```

### Application Logs
Logs are written to console. Redirect to file:
```bash
npm start > logs/app.log 2>&1
```

### Health Checks
```bash
curl http://localhost:5000/api/health
```

### Uptime Monitoring
Use services like:
- UptimeRobot (https://uptimerobot.com)
- Pingdom
- New Relic
- Datadog

## Security Hardening

### 1. Environment Variables
Never commit `.env` file. Use secrets management:
- AWS Secrets Manager
- Azure Key Vault
- HashiCorp Vault

### 2. API Rate Limiting
Add rate limiting middleware:
```bash
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})

app.use('/api/', limiter)
```

### 3. CORS Configuration
Update CORS in production:
```typescript
app.use(cors({
  origin: 'https://your-frontend-domain.com',
  credentials: true
}))
```

### 4. HTTPS
Always use HTTPS in production. Use Let's Encrypt:
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 5. Helmet.js
Add security headers:
```bash
npm install helmet
```

```typescript
import helmet from 'helmet'
app.use(helmet())
```

## Performance Optimization

### 1. Caching
Add Redis for caching:
```bash
npm install redis
```

### 2. Load Balancing
Use PM2 cluster mode:
```bash
pm2 start dist/index.js -i max --name stocksage
```

### 3. Database Connection Pooling
For PostgreSQL, configure connection pool size.

### 4. CDN
Serve static assets via CDN (CloudFlare, AWS CloudFront)

## Backup Strategy

### Database Backups
```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
cp stocksage.db backups/stocksage_$DATE.db

# Keep last 7 days
find backups/ -name "stocksage_*.db" -mtime +7 -delete
```

### PDF Backups
```bash
# Backup generated PDFs
tar -czf pdf_backup_$DATE.tar.gz generated-pdfs/
```

## Troubleshooting

### Application Won't Start
```bash
# Check Node version
node --version  # Should be 20+

# Check port availability
lsof -i :5000

# Check logs
pm2 logs stocksage --err
```

### Database Errors
```bash
# Delete and reinitialize database
rm stocksage.db
# Restart application - will recreate database
```

### OpenAI API Errors
- Check API key validity
- Check rate limits
- Check account balance

### Email Not Sending
- Verify Gmail App Password (not regular password)
- Check "Less secure app access" settings
- Verify SMTP settings

### SMS Not Sending
- Check Twilio account balance
- Verify phone number is verified
- Check phone number format (+1234567890)

## Scaling Considerations

### Horizontal Scaling
- Run multiple instances behind load balancer
- Use shared PostgreSQL database
- Use Redis for session storage
- Use message queue (RabbitMQ, AWS SQS) for async processing

### Vertical Scaling
- Increase RAM (4GB+ for heavy workloads)
- Use faster CPU
- Use SSD storage

## Cost Optimization

### OpenAI API Costs
- GPT-4o: ~$0.005 per 1K tokens input, ~$0.015 per 1K tokens output
- Average analysis: 2000 tokens = ~$0.04 per analysis
- 1000 analyses/month ≈ $40

### Tips to Reduce Costs:
1. Use GPT-3.5-turbo for non-critical analyses (80% cheaper)
2. Cache frequent analysis results
3. Implement request throttling
4. Set up cost alerts in OpenAI dashboard

## Support & Maintenance

### Regular Tasks
- Weekly: Check logs for errors
- Monthly: Review cost usage
- Quarterly: Update dependencies
- Yearly: Security audit

### Updating
```bash
git pull origin main
npm install
npm run build
pm2 restart stocksage
```

### Rollback
```bash
git checkout previous-commit-hash
npm install
npm run build
pm2 restart stocksage
```

## Getting Help

- GitHub Issues: https://github.com/your-username/StockSage/issues
- Documentation: https://github.com/your-username/StockSage/docs
- Email: support@yourcompany.com
