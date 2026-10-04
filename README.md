# Kyle B. R. Bennett — Personal Website

GitHub Pages–ready static website for `kylebrbennett.com`.

## Manual upload

1. Create a **public** GitHub repository named exactly `KyleBBen.github.io`.
2. Open the repository and choose **Add file → Upload files**.
3. Upload the **contents of this folder**, not the enclosing folder itself. `index.html` must appear at the repository root.
4. Commit the files to the `main` branch.
5. Open **Settings → Pages** and choose **Deploy from a branch**.
6. Select `main` and `/ (root)`, then save.
7. In **Settings → Pages → Custom domain**, enter `kylebrbennett.com` and save.

## Cloudflare DNS

GitHub will show the current DNS records it expects in the Pages settings. Add those records in Cloudflare DNS. Keep Cloudflare proxying **off / DNS only** until GitHub verifies the domain and provisions HTTPS. Then enable **Enforce HTTPS** in GitHub Pages.

The included `CNAME` file already contains `kylebrbennett.com`.

## Search launch checklist

- Verify `https://kylebrbennett.com/` in Google Search Console using the Cloudflare DNS method.
- Submit `https://kylebrbennett.com/sitemap.xml`.
- Request indexing for the homepage, About, Projects, Research, and Press pages.
- Update LinkedIn and GitHub profiles to link to `https://kylebrbennett.com/`.
- Add the new site URL to B3N Industries and retain a short “Kyle B. R. Bennett, founder” biography there.
- Replace the old Google Sites portfolio with a brief moved notice linking to the new domain; do not keep two competing full biographies live.

## Editing

The site uses plain HTML, CSS, and a small amount of JavaScript. No build step or paid hosting is required. Global styles are in `assets/styles.css`.

Before launch, verify every personal fact and project status. The current copy intentionally labels prototypes and proposed research as works in progress.
