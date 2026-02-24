# Deployment Guide - Vercel

This guide explains how to deploy your Next.js application to Vercel with proper Google OAuth integration.

## Problem: OAuth Redirects to Localhost

If you're experiencing redirects to `http://localhost:3000` after Google OAuth authentication on your production site, follow this guide to fix it.

## Prerequisites

1. A Vercel account
2. Google Cloud Console project with OAuth 2.0 credentials
3. Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)

## Step 1: Configure Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables for **Production** environment:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# App URL - REPLACE WITH YOUR ACTUAL VERCEL URL
NEXT_PUBLIC_APP_URL=https://your-app-name.vercel.app

# Cron Secret
CRON_SECRET=your-cron-secret
```

**Important:** Replace `https://your-app-name.vercel.app` with your actual Vercel deployment URL.

## Step 2: Update Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Navigate to **APIs & Services** → **Credentials**
4. Click on your OAuth 2.0 Client ID
5. Under **Authorized redirect URIs**, add your production callback URL:
   ```
   https://your-app-name.vercel.app/api/auth/google/callback
   ```
6. Keep the localhost URL for local development:
   ```
   http://localhost:3000/api/auth/google/callback
   ```
7. Click **Save**

## Step 3: Deploy to Vercel

After setting environment variables:

```bash
# If using Vercel CLI
vercel --prod

# Or push to your git branch (if auto-deploy is enabled)
git push origin main
```

## Step 4: Test the Integration

1. Visit your production site: `https://your-app-name.vercel.app`
2. Log in with your credentials
3. Navigate to Gmail Settings
4. Click "Connect Gmail"
5. You should be redirected to Google OAuth and then back to your **production URL** (not localhost)

## How It Works

The application now automatically determines the correct redirect URI:

- **Local Development**: Uses `http://localhost:3000/api/auth/google/callback`
- **Production**: Uses `https://your-app-name.vercel.app/api/auth/google/callback`

The redirect URI is constructed from `NEXT_PUBLIC_APP_URL` environment variable.

## Troubleshooting

### Still redirecting to localhost?

1. **Check Vercel environment variables** - Make sure `NEXT_PUBLIC_APP_URL` is set correctly
2. **Redeploy** - Environment variable changes require a redeploy
3. **Clear browser cache** - Old cached redirects might persist
4. **Check Google Console** - Ensure your production callback URL is in the authorized redirect URIs list

### OAuth error: redirect_uri_mismatch

This means the redirect URI in your request doesn't match what's configured in Google Cloud Console.

**Fix:**
- Add your production callback URL to Google Cloud Console authorized redirect URIs
- Make sure there are no typos in the URL
- Ensure HTTPS is used for production (not HTTP)

### Environment Variables Not Working

- Verify variables are set for the **Production** environment in Vercel
- Check for typos in variable names
- Redeploy after adding/changing variables

## Multi-Environment Setup (Optional)

If you want different configurations for Preview and Production:

1. Set `NEXT_PUBLIC_APP_URL` for **Production**: `https://your-app.vercel.app`
2. Set `NEXT_PUBLIC_APP_URL` for **Preview**: `https://your-app-git-[branch].vercel.app`
3. Add all preview URLs to Google OAuth authorized redirect URIs

## Security Notes

- Never commit `.env.local` or `.env.production` to git
- Keep your `GOOGLE_CLIENT_SECRET` secure
- Regularly rotate sensitive credentials
- Use different OAuth credentials for development and production if possible

## Support

If you encounter issues, check:
- Vercel deployment logs
- Browser console for errors
- Network tab to see the actual redirect URLs being used
