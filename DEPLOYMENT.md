# 🚀 Deployment Guide

This guide covers various deployment options for the Teknoify project, from development to production environments.

## 📋 Pre-deployment Checklist

Before deploying to production, ensure you've completed:

- [ ] **Environment Configuration**: Set up production environment variables
- [ ] **Security Review**: Enable CSP, security headers, and input validation
- [ ] **Performance Optimization**: Optimize images, enable compression, minification
- [ ] **Testing**: Run all tests and ensure 80%+ coverage
- [ ] **Accessibility**: Validate WCAG 2.1 AA compliance
- [ ] **SEO**: Configure meta tags, sitemap, and structured data
- [ ] **Analytics**: Set up tracking and monitoring
- [ ] **SSL Certificate**: Ensure HTTPS is configured
- [ ] **Domain Configuration**: Set up custom domain and DNS
- [ ] **Backup Strategy**: Configure automated backups

## 🌐 Deployment Options

### 1. GitHub Pages (Recommended for Static Sites)

**Pros**: Free, automatic deployment, GitHub integration
**Cons**: Static hosting only, limited server-side functionality

#### Automatic Deployment

The project includes GitHub Actions for automatic deployment:

```yaml
# Automatic deployment on push to main branch
# See .github/workflows/ci.yml
```

#### Manual Deployment

```bash
# Build and deploy manually
npm run build
npm run deploy
```

#### Custom Domain Setup

1. Add `CNAME` file to `public/` directory:
   ```
   teknoify.com
   ```

2. Configure DNS records:
   ```
   Type: CNAME
   Name: www
   Value: your-username.github.io
   
   Type: A
   Name: @
   Values: 185.199.108.153
           185.199.109.153
           185.199.110.153
           185.199.111.153
   ```

### 2. Netlify

**Pros**: CDN, form handling, serverless functions, easy SSL
**Cons**: Build time limits on free plan

#### Deploy Steps

1. **Connect Repository**
   - Link your GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `dist`

2. **Environment Variables**
   ```
   VITE_APP_TITLE=Teknoify
   VITE_ANALYTICS_ID=your-analytics-id
   VITE_API_BASE_URL=https://api.teknoify.com
   ```

3. **Custom Headers** (`public/_headers`):
   ```
   /*
     X-Frame-Options: DENY
     X-Content-Type-Options: nosniff
     X-XSS-Protection: 1; mode=block
     Referrer-Policy: strict-origin-when-cross-origin
     Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
   ```

4. **Redirects** (`public/_redirects`):
   ```
   # SPA fallback
   /*    /index.html   200
   
   # Redirect old URLs
   /old-page   /new-page   301
   ```

### 3. Vercel

**Pros**: Excellent performance, edge functions, automatic optimization
**Cons**: Limited build time on free plan

#### Deploy Steps

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Configuration** (`vercel.json`):
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "framework": "vite",
     "headers": [
       {
         "source": "/(.*)",
         "headers": [
           {
             "key": "X-Frame-Options",
             "value": "DENY"
           },
           {
             "key": "X-Content-Type-Options",
             "value": "nosniff"
           }
         ]
       }
     ],
     "rewrites": [
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```

### 4. Firebase Hosting

**Pros**: Google integration, global CDN, easy scaling
**Cons**: Requires Google account

#### Deploy Steps

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Initialize Firebase**
   ```bash
   firebase init hosting
   ```

3. **Configure** (`firebase.json`):
   ```json
   {
     "hosting": {
       "public": "dist",
       "ignore": [
         "firebase.json",
         "**/.*",
         "**/node_modules/**"
       ],
       "rewrites": [
         {
           "source": "**",
           "destination": "/index.html"
         }
       ],
       "headers": [
         {
           "source": "**/*.@(eot|otf|ttf|ttc|woff|font.css)",
           "headers": [
             {
               "key": "Access-Control-Allow-Origin",
               "value": "*"
             }
           ]
         }
       ]
     }
   }
   ```

4. **Deploy**
   ```bash
   npm run build
   firebase deploy
   ```

### 5. AWS S3 + CloudFront

**Pros**: Highly scalable, cost-effective, full AWS integration
**Cons**: More complex setup, requires AWS knowledge

#### Deploy Steps

1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://teknoify-website
   ```

2. **Configure Bucket Policy**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::teknoify-website/*"
       }
     ]
   }
   ```

3. **Deploy to S3**
   ```bash
   npm run build
   aws s3 sync dist/ s3://teknoify-website --delete
   ```

4. **Set up CloudFront Distribution**
   - Origin: S3 bucket
   - Default root object: `index.html`
   - Error pages: 404 → `/index.html` (200)

## 🔧 Environment Configuration

### Production Environment Variables

Create `.env.production`:

```env
# Production Configuration
VITE_APP_TITLE=Teknoify
VITE_APP_VERSION=1.0.0
VITE_API_BASE_URL=https://api.teknoify.com
VITE_ANALYTICS_ID=G-XXXXXXXXXX
VITE_SITE_URL=https://teknoify.com

# Security
VITE_ENABLE_CSP=true
VITE_ENABLE_SECURITY_HEADERS=true

# Features
VITE_ENABLE_PWA=true
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_TRACKING=true
```

### Build Optimization

```bash
# Production build with optimizations
npm run build

# Analyze bundle size
npm run analyze

# Preview production build locally
npm run preview
```

## 📊 Performance Optimization

### Build Optimizations

1. **Code Splitting**
   - Automatic vendor chunk splitting
   - Route-based code splitting
   - Dynamic imports for large libraries

2. **Asset Optimization**
   - Image compression and WebP conversion
   - CSS minification and purging
   - JavaScript minification and tree shaking

3. **Caching Strategy**
   - Long-term caching for static assets
   - Service worker for offline caching
   - CDN edge caching

### Performance Monitoring

```javascript
// Performance monitoring in production
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

// Track Core Web Vitals
getCLS(console.log)
getFID(console.log)
getFCP(console.log)
getLCP(console.log)
getTTFB(console.log)
```

## 🔐 Security Configuration

### Content Security Policy

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'nonce-{random}' https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https:;
  connect-src 'self' https://www.google-analytics.com;
">
```

### Security Headers

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## 📈 Monitoring & Analytics

### Performance Monitoring

1. **Google PageSpeed Insights**
   - Monitor Core Web Vitals
   - Track performance scores
   - Get optimization suggestions

2. **Real User Monitoring (RUM)**
   - Track actual user performance
   - Monitor error rates
   - Analyze user behavior

3. **Lighthouse CI**
   - Automated performance testing
   - Performance budgets
   - Regression detection

### Error Tracking

```javascript
// Sentry integration for error tracking
import * as Sentry from "@sentry/browser"

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV
})
```

## 🔄 Continuous Deployment

### GitHub Actions Workflow

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    - run: npm ci
    - run: npm run test
    - run: npm run build
    - name: Deploy to GitHub Pages
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./dist
```

### Deployment Strategies

1. **Blue-Green Deployment**
   - Zero-downtime deployments
   - Easy rollback capability
   - Perfect for critical applications

2. **Rolling Deployment**
   - Gradual traffic migration
   - Reduced risk
   - Good for large-scale applications

3. **Canary Deployment**
   - Test with small user percentage
   - Monitor metrics before full rollout
   - Ideal for feature testing

## 🆘 Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Routing Issues (SPA)**
   - Configure server redirects
   - Set up fallback to `index.html`
   - Update `.htaccess` or server config

3. **Environment Variable Issues**
   - Ensure `VITE_` prefix for client-side variables
   - Check variable names and values
   - Verify deployment platform configuration

4. **Performance Issues**
   - Analyze bundle size
   - Optimize images and assets
   - Enable compression and caching

### Health Checks

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.VITE_APP_VERSION
  })
})
```

## 📞 Support

For deployment issues:

- **Documentation**: Check this guide and README
- **GitHub Issues**: Report deployment problems
- **Community**: Ask questions in discussions
- **Email**: info@teknoify.com

---

**Happy Deploying!** 🚀