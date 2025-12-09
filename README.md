This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
# Cloudflare R2 for CDN persistence
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_key
CLOUDFLARE_R2_BUCKET=your_bucket_name
# Optional: public domain or R2 public URL (defaults to R2 bucket URL)
CLOUDFLARE_R2_PUBLIC_BASE_URL=https://<bucket>.<account>.r2.cloudflarestorage.com
```

After setting env vars, install dependencies and generate the Prisma client:

```bash
pnpm install
pnpm prisma generate
```

### Setting Up Google AI API Key

If you encounter the `API_KEY_SERVICE_BLOCKED` error, follow these steps:

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select or create a project**
3. **Enable the Generative Language API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Generative Language API"
   - Click on it and press "Enable"
4. **Create an API Key**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key
5. **Configure API Key Restrictions** (optional but recommended):
   - Click on the API key you just created
   - Under "API restrictions", select "Restrict key"
   - Choose "Generative Language API" from the list
   - Save the changes
6. **Enable Billing** (if required):
   - Some Google Cloud services require billing to be enabled
   - Go to "Billing" in the Cloud Console and link a billing account

After completing these steps, add the API key to your `.env.local` file and restart your development server.

### Setting Up Google Maps API Key

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Enable the Maps JavaScript API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Maps JavaScript API"
   - Click on it and press "Enable"
3. **Create an API Key** (or reuse the one from above)
4. **Add the API key to your `.env.local` file**

## Running the Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
