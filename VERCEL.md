# Deploy to Vercel

Create separate Vercel projects for the frontend and backend from this repository.

## Web frontend

- Root Directory: `client`
- Framework Preset: Other
- Build Command: `npm run build` (configured in `vercel.json`)
- Output Directory: `dist`
- Install Command: `npm ci --include=dev`

Set these environment variables in Vercel before deployment:

- `EXPO_PUBLIC_API_URL=https://ecom-native-app-server-psi.vercel.app/api`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`: your Clerk publishable key

Use matching Clerk keys on the client and backend. Configure the deployed frontend domain and authentication redirect URLs in Clerk. Public Expo variables are embedded during the build; redeploy after changing them.

The web export uses a single-page application so dynamic product/order routes work without generating every ID during the build. Vercel rewrites page requests to the application entry point. Existing assets are served normally.

## Express backend

- Root Directory: `server`
- Framework Preset: Express (automatic detection)
- Keep the default output directory.
- Configure the server environment separately: `MONGODB_URI`, `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`.
- Configure Clerk webhooks to use the backend `/api/clerk` endpoint and set `CLERK_WEBHOOK_SIGNING_SECRET` from Clerk.

The backend already exports `server.ts` for Vercel, reuses database connections, and does not start its local port listener on Vercel.

## Verify

Run `npm run build` from `client`. After deployment, open a product URL directly and refresh it; confirm authenticated API calls use the configured backend. Vercel hosts the web version; Android and iOS binaries continue to use EAS Build.

