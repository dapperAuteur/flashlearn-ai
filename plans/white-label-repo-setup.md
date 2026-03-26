# White-Label Starter App — Private Repo Setup

## Overview

The white-label app (`standalone/flashlearn-starter/`) is sold as a commercial product. Buyers get access to a **separate private GitHub repo**. The API key acts as the runtime license.

## Pricing

| License | Price | Includes |
|---------|-------|----------|
| Standard | $499 one-time | 1 domain, branding editor, Vercel deploy, community support |
| School & Enterprise | $999/year | Unlimited domains, priority support, continuous updates, Pro API tier |

API usage billed separately per API tier.

## Setup Steps

### 1. Create the private repo on GitHub

```bash
gh repo create dapperAuteur/flashlearn-starter --private --description "White-Label Study App powered by FlashLearnAI API"
```

### 2. Push the standalone app to it

```bash
cd standalone/flashlearn-starter
git init
git add .
git commit -m "initial commit: FlashLearn Starter white-label app"
git remote add origin https://github.com/dapperAuteur/flashlearn-starter.git
git push -u origin main
```

### 3. After a customer purchases, grant repo access

```bash
# Replace BUYER_USERNAME with their GitHub username
gh api repos/dapperAuteur/flashlearn-starter/collaborators/BUYER_USERNAME -X PUT -f permission=pull
```

This gives them read-only (pull) access. They can clone but not push.

### 4. Customer setup flow

1. Customer purchases via email (admin.flashlearnai@awews.com) or CashApp ($centenarian)
2. You create/assign them a FlashLearnAI API key (Public type)
3. You grant their GitHub username access to `dapperAuteur/flashlearn-starter`
4. Send them the setup email with:
   - Repo URL: `https://github.com/dapperAuteur/flashlearn-starter`
   - Their API key: `fl_pub_...`
   - Quick start link: `https://flashlearnai.witus.online/docs/api/getting-started`

### 5. Keeping the starter app updated

When you make improvements to `standalone/flashlearn-starter/` in the main repo:

```bash
# From the main flashlearn-ai repo
cd standalone/flashlearn-starter
cp -r . /tmp/flashlearn-starter-update

# Switch to the starter repo
cd /path/to/flashlearn-starter
cp -r /tmp/flashlearn-starter-update/* .
git add .
git commit -m "update: description of changes"
git push
```

School & Enterprise customers automatically get updates via `git pull`.

## Notes

- The main `flashlearn-ai` repo stays unchanged — `standalone/` is your development copy
- Standard license buyers get a snapshot; they don't receive updates unless they upgrade
- The API key IS the license — the app doesn't function without a valid key
- Track purchases via the Promo Campaign manager on `/admin/revenue`
