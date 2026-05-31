# BenchPro — Custom SMTP via Resend

This is a one-time manual configuration done in the Supabase dashboard.  
No code changes are required — Supabase handles all transactional emails once SMTP is wired up.

---

## Prerequisites

1. A verified domain on [Resend](https://resend.com) — `benchpro.in` must be verified with DNS records.
2. A Resend API key with **Sending** permission.

---

## Steps

### 1. Get Resend SMTP credentials

Log in to [app.resend.com](https://app.resend.com) → **Settings → SMTP**

Note the following:
| Setting | Value |
|---------|-------|
| Host | `smtp.resend.com` |
| Port | `465` (TLS) |
| Username | `resend` |
| Password | Your Resend API key |

---

### 2. Configure Supabase SMTP

1. Go to [Supabase Dashboard](https://app.supabase.com) → **Project: benchpro-db**
2. Navigate to **Authentication → Email Templates → SMTP Settings**
3. Enable **Custom SMTP**
4. Fill in:

| Field | Value |
|-------|-------|
| Sender name | `BenchPro` |
| Sender email | `noreply@benchpro.in` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | *(your Resend API key)* |

5. Click **Save**

---

### 3. Test the connection

1. Go to **Authentication → Users** → click any user → **Send magic link**
2. Check that the email arrives from `noreply@benchpro.in`
3. Check Resend dashboard → **Logs** to confirm delivery

---

### 4. Email templates

Supabase sends the following emails automatically once SMTP is configured:
- **Confirm email** — on signup
- **Magic link** — passwordless login
- **Password reset** — when user clicks "Forgot password"
- **Email change** — when user updates their email

To customise templates: **Authentication → Email Templates** in the Supabase dashboard.

Recommended subject lines:
- Confirm: `Confirm your BenchPro account`
- Reset: `Reset your BenchPro password`

---

### 5. DNS records required on benchpro.in

Resend will provide the exact records. Typically:
- SPF: `v=spf1 include:amazonses.com ~all` (Resend uses SES under the hood)
- DKIM: TXT record provided by Resend
- DMARC: `v=DMARC1; p=none; rua=mailto:dmarc@benchpro.in`

---

## Notes

- Resend free tier: 100 emails/day, 3,000/month. Upgrade as needed.
- Do **not** commit Resend API keys to git. Store them only in the Supabase dashboard.
- The `redirectTo` URL in password reset is already set to `https://www.benchpro.in/reset-password` in code.
