# GitHub Actions Workflows

## Daily Bulk Prediction Workflow

This workflow automatically triggers bulk predictions for all company locations daily at 12 PM Malaysian time.

### Quick Setup Checklist

- [ ] Add `API_BASE_URL` secret (e.g., `https://api.yourdomain.com`)
- [ ] Add `API_ADMIN_EMAIL` secret (admin user email)
- [ ] Add `API_ADMIN_PASSWORD` secret (admin user password)
- [ ] Verify the workflow file exists at `.github/workflows/daily-bulk-prediction.yml`
- [ ] Test the workflow manually using "Run workflow" button

### Secrets Required

1. **API_BASE_URL** - Your API server URL
2. **API_ADMIN_EMAIL** - Admin account email
3. **API_ADMIN_PASSWORD** - Admin account password

### Schedule

- **Malaysian Time**: 12:00 PM (noon) daily
- **UTC Time**: 4:00 AM daily
- **Cron**: `0 4 * * *`

### Manual Trigger

You can trigger this workflow manually from the GitHub Actions tab.

### Documentation

See [docs/github-actions-setup.md](../../docs/github-actions-setup.md) for detailed setup instructions.

