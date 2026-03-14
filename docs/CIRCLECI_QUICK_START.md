# 🚀 CircleCI Quick Start Checklist

## ✅ Immediate Steps (5 minutes)

- [ ] **1. Sign up at [circleci.com](https://circleci.com)**
  - Use "Sign Up with GitHub" for easiest setup

- [ ] **2. Add your project**
  - Go to "Projects" → Find `drone4dengue` → Click "Set Up Project"
  - Select "Use Existing Config" (your `.circleci/config.yml` is already there!)
  - Choose your branch (`main` or `master`)
  - Click "Start Building"

- [ ] **3. Your first build will start automatically!**
  - Watch it run in real-time
  - All 5 jobs run in parallel (faster than GitHub Actions)

## 🔐 Optional: Add Environment Variables

Only needed if your tests require database access:

- [ ] Go to: **Project Settings → Environment Variables**
- [ ] Add: `DATABASE_URL` (if tests need it)

**Note:** Your current config only does linting and building, which typically don't need database access.

## 📊 What You Get

- ✅ **6,000 free build minutes/month** (3x more than GitHub!)
- ✅ **Parallel job execution** (all 5 jobs run simultaneously)
- ✅ **Smart caching** (saves credits by caching dependencies)
- ✅ **Automatic builds** on every push

## 🎯 Current Workflow

Your CircleCI config runs these jobs on every push:
1. ✅ **test-client-admin** - Lint & build Next.js app
2. ✅ **test-client-mobile** - Lint Expo/React Native app  
3. ✅ **test-server-api** - Install deps & generate Prisma client
4. ✅ **test-server-ml** - Install Python deps & check syntax
5. ✅ **test-python-scripts** - Check Python script syntax

## 🔄 Disable GitHub Actions (Save Remaining Minutes)

To stop using GitHub Actions:

```bash
# Option 1: Rename workflows folder
git mv .github/workflows .github/workflows.disabled
git commit -m "Disable GitHub Actions - using CircleCI now"
git push
```

Or disable in GitHub: **Settings → Actions → General → Disable Actions**

## ❓ Need Help?

- Check `docs/circleci-setup-guide.md` for detailed instructions
- View build logs in CircleCI dashboard
- All builds are visible in the "Pipelines" tab

---

**That's it!** Your CI/CD is now running on CircleCI. 🎉
