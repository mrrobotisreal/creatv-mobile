# Mobile Auth Setup

## Environment variables

Create a `.env.local` with:

- `EXPO_PUBLIC_SUPABASE_URL=`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=`
- `EXPO_PUBLIC_USER_API_URL=` (base URL for user-service)

## Supabase redirect URLs

In the Supabase dashboard (Auth → URL Configuration → Redirect URLs), add:

- `creatv://login-callback`

## Dev build note

AuthSession proxy flows are deprecated. Use a dev build or production build with the
custom `creatv://` scheme so the OAuth redirect can return to the app.

