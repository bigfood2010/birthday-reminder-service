# Repository Setup (Manual Git + GitHub)

Use this checklist to manually set up Git for this project and publish it to GitHub.

## Recommended Repository Metadata

- **Repository name:** `birthday-reminder-service`
- **Description:** `Timezone-aware birthday reminder API with NestJS and MongoDB.`
- **README:** use the `README.md` in this project root

## Step-by-Step

1. **Open project root**

   ```bash
   cd "/Users/duongquangvinh/Documents/Local Repo/birthday-reminder-service"
   ```

2. **Ensure ignore rules are ready**

   This repo already includes `.gitignore` for `node_modules`, `dist`, logs, and local env files.

3. **Initialize Git (skip if already initialized)**

   ```bash
   git init
   git branch -M main
   ```

4. **Set Git identity (if not configured yet)**

   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```

5. **Create first commit**

   ```bash
   git add .
   git commit -m "chore: initial project setup"
   ```

6. **Create GitHub repo manually**

   In GitHub UI:

   - Click **New repository**
   - Name: `birthday-reminder-service`
   - Description: `Timezone-aware birthday reminder API with NestJS and MongoDB.`
   - Choose visibility (Public/Private)
   - **Do not** initialize with README/.gitignore/license (this repo already has them)

7. **Connect remote and push**

   ```bash
   git remote add origin git@github.com:<your-username>/birthday-reminder-service.git
   git push -u origin main
   ```

8. **Verify setup**

   ```bash
   git remote -v
   git branch -vv
   ```

## Optional: HTTPS remote instead of SSH

```bash
git remote add origin https://github.com/<your-username>/birthday-reminder-service.git
git push -u origin main
```
