# Noah — AI Governance & Cybersecurity GRC

Personal professional website built with plain HTML, CSS, and vanilla JavaScript. Designed for deployment on GitHub Pages with zero build step.

## Quick Start

Open `index.html` in a browser, or serve locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

Before committing shared layout or visual changes, run:

```bash
npm run sync:layout
npm test
```

## File Structure

```
├── index.html              Main single-page site
├── blog.html               Blog listing page
├── posts/
│   └── template.html       Blog post template (duplicate for new posts)
├── css/
│   ├── style.css           CSS import manifest
│   ├── tokens.css          Colors, type scale, spacing
│   ├── base.css            Resets and base typography
│   ├── layout.css          Containers, nav, footer, sections
│   ├── components.css      Reusable lists, buttons, motion
│   └── pages.css           Page-specific layouts
├── js/
│   └── main.js             Scroll animations, nav, mobile menu
├── scripts/
│   └── sync-shared-layout.mjs  Generates shared nav/footer and static checks
├── assets/
│   ├── headshot.jpg         Your headshot (replace placeholder)
│   └── resume.pdf           Your resume (add file)
└── README.md
```

## Customization

### Replace Placeholders

1. **Contact info** — In `index.html`, replace `hello@example.com`, `linkedin.com/in/placeholder`, and `github.com/placeholder` with your real links.
2. **Headshot** — Add your photo as `assets/headshot.jpg`.
3. **Resume** — Add your resume as `assets/resume.pdf`.

### Add a Blog Post

1. Duplicate `posts/template.html` and rename it (e.g., `posts/ai-governance-lessons.html`).
2. Update the `<title>`, heading, date, reading time, and article content.
3. Add a new `.writing-item` entry in `index.html` (Writing section) and `blog.html`.

### Colors and Fonts

All design tokens are CSS custom properties in `css/tokens.css`. Change colors,
fonts, or spacing there and it propagates everywhere.

## Deploy to GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Under **Source**, select **Deploy from a branch**.
4. Choose **main** branch, **/ (root)** folder.
5. Save. Your site will be live at `https://<username>.github.io/<repo-name>/`.

The GitHub Pages workflow runs `npm test` before deployment so shared
navigation/footer cannot drift between pages and public pages cannot reintroduce
archive access links or the old cursor-trace background.
