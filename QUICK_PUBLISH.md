# 🚀 Quick Publish Guide

## Step 1: npm Login

```bash
# Login to npm (you'll be prompted for username, password, email)
npm login

# Verify login
npm whoami
```

## Step 2: Update Your Email

Edit `package.json` and update your email:
```json
"author": "chene <YOUR_REAL_EMAIL@example.com>",
```

## Step 3: Publish

```bash
# Option 1: Interactive publishing (recommended)
npm run publish:interactive

# Option 2: Direct publishing
npm publish
```

## Step 4: Test

After publishing, test it works:
```bash
npx checklist-mcp-server@latest --help
```

## Troubleshooting

**If you get "package name already exists":**
- Change the name in package.json to something unique like:
  ```json
  "name": "@chene/checklist-mcp-server",
  ```
- Then publish with: `npm publish --access public`

**If you get authentication errors:**
- Run `npm login` again
- Make sure you have a verified npm account

**If tests fail:**
- Run `npm test` to see what's failing
- Fix any issues and try again