# Security & Admin Access Setup

## 🔐 Admin Access Control

This blog system uses **two-layer admin access control** to ensure only authorized users can access the admin panel (`/admin`).

## How It Works

### Layer 1: Authentication
Users must sign in with Google or GitHub OAuth.

### Layer 2: Authorization
Only users marked as **admin** can access the admin panel. This is controlled by:

1. **Email Whitelist** (Recommended for personal blogs)
2. **Role-Based System** (Alternative method)

## Setup Methods

### Method 1: Email Whitelist (Recommended)

The simplest way to control admin access. Only specified email addresses can access the admin area.

#### Configuration

Add your admin email(s) to `.env.local`:

```env
# Single admin
ADMIN_EMAILS=your@email.com

# Multiple admins (comma-separated)
ADMIN_EMAILS=admin1@email.com,admin2@email.com,admin3@email.com
```

#### How It Works

1. User signs in with Google/GitHub
2. System checks if their email is in `ADMIN_EMAILS`
3. If yes → Grant admin access
4. If no → Show "Access Denied" page

#### First-Time Setup

1. Add your email to `.env.local`:
   ```env
   ADMIN_EMAILS=your.actual.email@gmail.com
   ```

2. Restart your dev server:
   ```bash
   pnpm dev
   ```

3. Sign in with the Google/GitHub account that uses that email

4. You'll automatically get admin access!

### Method 2: Role-Based System

Uses a `role` field in the database. More flexible for multi-admin systems.

#### Database Schema

```typescript
users {
  id: uuid
  name: text
  email: text
  role: text  // 'admin' or 'user'
  ...
}
```

#### Setting Admin Manually

Connect to your database and update the user:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'your@email.com';
```

#### Auto-Assign on First Login

When a whitelisted email signs in for the first time, the system automatically sets `role = 'admin'` (configured in `lib/auth.ts` hooks).

## Security Flow

```
User Login (OAuth)
       ↓
  Has Session?
       ↓ No → Redirect to /auth/login
       ↓ Yes
  Is Admin?
       ↓ No → Redirect to /auth/unauthorized
       ↓ Yes
  Access Granted to /admin
```

## Implementation Details

### Files Modified

1. **`lib/db/schema.ts`**
   - Added `role` field to `users` table

2. **`lib/auth-utils.ts`** (NEW)
   - `isAdmin()` - Check if user is admin
   - `getAdminEmails()` - Parse admin emails from env

3. **`lib/auth.ts`**
   - Added hook to auto-assign admin role on first login

4. **`middleware.ts`**
   - Added admin check for `/admin` routes
   - Redirects non-admins to `/auth/unauthorized`

5. **`app/(cms)/auth/unauthorized/page.tsx`** (NEW)
   - Shows "Access Denied" message to non-admins

### Middleware Protection

```typescript
// middleware.ts
if (pathname.startsWith('/admin')) {
  // 1. Check if logged in
  if (!session) redirect('/auth/login')

  // 2. Check if admin
  if (!isAdmin(session.user)) redirect('/auth/unauthorized')
}
```

## Testing

### Test as Admin

1. Add your email to `ADMIN_EMAILS`
2. Sign in with that account
3. Visit `/admin` - You should see the admin panel ✅

### Test as Non-Admin

1. Sign in with a different email (not in `ADMIN_EMAILS`)
2. Visit `/admin` - You should see "Access Denied" ❌

## Database Migration

After adding the `role` field, run:

```bash
pnpm db:push
```

This updates your database schema to include the new `role` column.

## Common Issues

### Issue: "I'm in the whitelist but can't access admin"

**Solution:**
1. Check `.env.local` has correct email (no typos, spaces)
2. Restart dev server: `pnpm dev`
3. Sign out and sign in again
4. Check that OAuth account email matches exactly

### Issue: "Any email can access admin"

**Solution:**
1. Verify `ADMIN_EMAILS` is set in `.env.local`
2. Check middleware is working:
   ```bash
   # Should see admin check logs
   pnpm dev
   ```
3. Clear cookies and try again

### Issue: "Database error about role field"

**Solution:**
```bash
# Run migration
pnpm db:push
```

## Best Practices

1. **Use Email Whitelist for Personal Blogs**
   - Simple, secure, easy to manage
   - Perfect for 1-3 admins

2. **Use Role System for Multi-User Blogs**
   - More flexible
   - Can add/remove admins via database

3. **Keep Admin Emails Secret**
   - Don't commit `.env.local` to git
   - Use environment variables in production

4. **Regular Security Checks**
   - Review who has admin access
   - Remove old admin emails

## Production Deployment

### Vercel

```bash
# Set environment variable
vercel env add ADMIN_EMAILS production
# Enter: your@email.com

# Deploy
vercel deploy --prod
```

### Other Platforms

Add `ADMIN_EMAILS` to your platform's environment variables:
- Railway: `railway variables set ADMIN_EMAILS=your@email.com`
- Netlify: Site settings → Environment variables
- Docker: Add to `.env` or pass as `-e ADMIN_EMAILS=...`

## Summary

✅ **Two-layer security**: Authentication (OAuth) + Authorization (Admin check)
✅ **Easy setup**: Just add email to `.env.local`
✅ **Flexible**: Email whitelist OR role-based system
✅ **Secure**: Non-admins can't access `/admin` routes
✅ **User-friendly**: Clear "Access Denied" message for unauthorized users

---

**Questions?** Check the code in:
- `middleware.ts` - Route protection
- `lib/auth-utils.ts` - Admin checking logic
- `lib/auth.ts` - Auto-role assignment
