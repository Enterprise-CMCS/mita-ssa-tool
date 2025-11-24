# GitHub Pages Setup Guide

This guide provides step-by-step instructions for configuring GitHub Pages to deploy the MITA State Self-Assessment Tool.

## Prerequisites

- Repository must be public or you must have GitHub Pro/Team/Enterprise for private repository Pages
- You must have admin access to the repository
- The repository must contain the deployment workflow file (`.github/workflows/deploy.yml`)

## Configuration Steps

### Step 1: Enable GitHub Pages

1. Navigate to your repository on GitHub
2. Click on **Settings** (gear icon in the top navigation)
3. In the left sidebar, scroll down and click on **Pages** (under "Code and automation")

### Step 2: Configure Source

1. Under **Build and deployment**, find the **Source** dropdown
2. Select **GitHub Actions** from the dropdown menu
   - This tells GitHub Pages to use the workflow file for deployment
   - Do NOT select "Deploy from a branch" - we're using GitHub Actions instead

### Step 3: Verify Configuration

After selecting GitHub Actions as the source, you should see:
- A message indicating that GitHub Pages will deploy from GitHub Actions
- No additional branch or folder selection is needed

### Step 4: Configure HTTPS (Recommended)

1. Scroll down to the **Enforce HTTPS** section
2. Check the box to **Enforce HTTPS**
   - This ensures all traffic to your site uses secure HTTPS connections
   - May take a few minutes to become available after first deployment

### Step 5: Note Your GitHub Pages URL

Your site will be published at:
```
https://<username>.github.io/<repository-name>/
```

For example:
```
https://naretakis.github.io/mita-state-self-assessment-tool/
```

## Triggering Your First Deployment

### Option 1: Push to Main Branch

The easiest way to trigger a deployment:

```bash
# Make a small change (or use --allow-empty)
git commit --allow-empty -m "Trigger initial deployment"
git push origin main
```

### Option 2: Manual Workflow Dispatch

You can also trigger deployment manually:

1. Go to the **Actions** tab in your repository
2. Click on **Deploy to GitHub Pages** workflow in the left sidebar
3. Click the **Run workflow** button (on the right)
4. Select the **main** branch
5. Click **Run workflow**

## Monitoring Deployment

### Viewing Workflow Progress

1. Go to the **Actions** tab in your repository
2. Click on the most recent workflow run
3. Watch the progress of the **build** and **deploy** jobs
4. Typical deployment takes 3-5 minutes

### Deployment Status Indicators

- **Yellow circle**: Workflow is running
- **Green checkmark**: Deployment succeeded
- **Red X**: Deployment failed (see logs for details)

## Verification Checklist

After your first successful deployment, verify:

- [ ] Visit your GitHub Pages URL
- [ ] Homepage loads correctly
- [ ] Navigation works (click through a few pages)
- [ ] Assets load properly (CSS, JavaScript, images)
- [ ] Browser console shows no errors (press F12 to open developer tools)
- [ ] HTTPS is enforced (URL shows padlock icon)

## Troubleshooting

### Issue: 404 Error on GitHub Pages URL

**Symptoms**: Visiting your GitHub Pages URL shows a 404 error

**Solutions**:
1. Verify GitHub Pages is enabled in Settings > Pages
2. Check that Source is set to "GitHub Actions"
3. Ensure at least one successful deployment has completed
4. Wait 5-10 minutes after first deployment for DNS propagation
5. Try clearing your browser cache or using incognito mode

### Issue: Assets Not Loading (Broken Styling)

**Symptoms**: Page loads but looks unstyled, images missing, JavaScript not working

**Solutions**:
1. Check browser console for 404 errors on asset files
2. Verify `NEXT_PUBLIC_BASE_PATH` in workflow matches your repository name
3. Ensure the path format is: `/repository-name` (with leading slash, no trailing slash)
4. Rebuild and redeploy after fixing the base path

**Example Fix**:
```yaml
# In .github/workflows/deploy.yml
- name: Build application
  run: npm run build
  env:
    NEXT_PUBLIC_BASE_PATH: /your-repository-name  # Update this
```

### Issue: Deployment Workflow Fails

**Symptoms**: Red X on workflow run in Actions tab

**Solutions**:
1. Click on the failed workflow run to view logs
2. Check the specific step that failed
3. Common issues:
   - **Build failures**: Check for TypeScript errors or linting issues
   - **Test failures**: Run `npm test` locally to identify failing tests
   - **Dependency issues**: Delete `node_modules` and `package-lock.json`, then run `npm install`
4. Fix the issue locally, commit, and push to trigger a new deployment

### Issue: Slow Deployment Times

**Symptoms**: Deployment takes longer than 5 minutes

**Solutions**:
1. First deployment is always slower (no cache)
2. Subsequent deployments should be faster due to npm caching
3. Check Actions logs for which step is taking longest
4. If consistently slow, check GitHub Status page for service issues

### Issue: Changes Not Appearing After Deployment

**Symptoms**: Deployment succeeds but changes don't show on the site

**Solutions**:
1. Hard refresh your browser: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
2. Clear browser cache completely
3. Try accessing the site in incognito/private mode
4. Check the deployment timestamp in Actions to confirm it's recent
5. Verify you're looking at the correct URL (not a cached old URL)

## Customizing for Your Fork

If you fork this repository, you'll need to update the base path:

### Step 1: Update Workflow File

Edit `.github/workflows/deploy.yml`:

```yaml
- name: Build application
  run: npm run build
  env:
    NEXT_PUBLIC_BASE_PATH: /your-repository-name  # Change this
```

### Step 2: Update README (Optional)

Update the deployment URL in `README.md` to reflect your repository:

```markdown
### Deployment URL
https://your-username.github.io/your-repository-name
```

### Step 3: Test Locally

Before deploying, test the build locally with your base path:

```bash
# Set the environment variable
export NEXT_PUBLIC_BASE_PATH=/your-repository-name

# Build the application
npm run build

# The output will be in the 'out' directory
# You can serve it locally to test:
npx serve out
```

## Advanced Configuration

### Custom Domain

To use a custom domain with GitHub Pages:

1. Add a `CNAME` file to the `public/` directory with your domain name
2. Configure DNS records with your domain provider:
   - Add a CNAME record pointing to `<username>.github.io`
   - Or add A records pointing to GitHub's IP addresses
3. In GitHub Settings > Pages, enter your custom domain
4. Enable HTTPS enforcement (may take up to 24 hours)

### Branch Protection

To prevent accidental deployments, configure branch protection:

1. Go to Settings > Branches
2. Add a branch protection rule for `main`
3. Enable:
   - Require pull request reviews before merging
   - Require status checks to pass before merging
   - Require branches to be up to date before merging

## Support and Resources

### GitHub Documentation
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Configuring a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

### Project Resources
- [README.md](README.md) - Project overview and deployment information
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [CHANGELOG.md](CHANGELOG.md) - Version history and changes

### Getting Help

If you encounter issues not covered in this guide:

1. Check the [GitHub Actions logs](../../actions) for detailed error messages
2. Review the [GitHub Pages documentation](https://docs.github.com/en/pages)
3. Open an issue in the repository with:
   - Description of the problem
   - Steps to reproduce
   - Screenshots of error messages
   - Link to failed workflow run (if applicable)

## Quick Reference

### Essential Commands

```bash
# Trigger deployment
git push origin main

# Test build locally
npm run build

# Run quality checks before pushing
npm run check

# View build output
ls -la out/
```

### Key Files

- `.github/workflows/deploy.yml` - Deployment workflow configuration
- `next.config.js` - Next.js build configuration
- `public/` - Static assets that will be copied to output
- `out/` - Build output directory (created during build)

### Important URLs

- Repository Settings: `https://github.com/<username>/<repo>/settings`
- GitHub Actions: `https://github.com/<username>/<repo>/actions`
- GitHub Pages Settings: `https://github.com/<username>/<repo>/settings/pages`
- Deployed Site: `https://<username>.github.io/<repo>/`

---

**Last Updated**: November 17, 2025
