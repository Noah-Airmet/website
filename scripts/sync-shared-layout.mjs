import { access, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const publicPages = [
  "index.html",
  "blog.html",
  "commitments.html",
  "posts/template.html"
];

const generatedHeaderPattern =
  /<!-- shared-nav:start -->[\s\S]*?<!-- shared-nav:end -->/;
const legacyHeaderPattern =
  /<header class="site-nav" role="banner">[\s\S]*?<\/header>/;
const generatedFooterPattern =
  /<!-- shared-footer:start -->[\s\S]*?<!-- shared-footer:end -->/;
const legacyFooterPattern =
  /<footer class="site-footer">[\s\S]*?<\/footer>/;

const requiredCssModules = [
  "css/tokens.css",
  "css/base.css",
  "css/layout.css",
  "css/components.css",
  "css/pages.css",
  "css/style.css"
];

function pagePrefix(relativePath) {
  const depth = relativePath.split(path.sep).length - 1;
  return depth === 0 ? "" : "../".repeat(depth);
}

function pageActiveSection(relativePath) {
  if (relativePath === "blog.html" || relativePath.startsWith(`posts${path.sep}`)) {
    return "writing";
  }

  if (relativePath === "commitments.html") {
    return "commitments";
  }

  return "";
}

function navLink({ href, label, section }, activeSection) {
  const active = section === activeSection;
  const attrs = active ? ` class="active" aria-current="page"` : "";
  return `          <a href="${href}"${attrs}>${label}</a>`;
}

function renderHeader(relativePath) {
  const prefix = pagePrefix(relativePath);
  const activeSection = pageActiveSection(relativePath);
  const onHome = relativePath === "index.html";
  const links = [
    {
      href: `${prefix}blog.html`,
      label: "Writing",
      section: "writing"
    },
    {
      href: `${prefix}commitments.html`,
      label: "Commitments",
      section: "commitments"
    },
    {
      href: onHome ? "#contact" : `${prefix}index.html#contact`,
      label: "Contact",
      section: "contact"
    }
  ];

  return `<!-- shared-nav:start -->
  <header class="site-nav" role="banner">
    <div class="container">
      <a href="${prefix}index.html" class="nav-logo">noahairmet.com</a>
      <nav aria-label="Main navigation">
        <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false">
          <span></span>
          <span></span>
          <span></span>
        </button>
        <div class="nav-links">
${links.map((link) => navLink(link, activeSection)).join("\n")}
        </div>
      </nav>
    </div>
  </header>
  <!-- shared-nav:end -->`;
}

function renderFooter() {
  return `<!-- shared-footer:start -->
  <footer class="site-footer">
    <div class="container">
      <p>&copy; 2026 Noah Airmet</p>
    </div>
  </footer>
  <!-- shared-footer:end -->`;
}

async function listHtmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.name === "node_modules" || entry.name === "workers") continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listHtmlFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      files.push(fullPath);
    }
  }

  return files;
}

function assertNoPublicArchiveLinks(relativePath, html) {
  if (!publicPages.includes(relativePath)) return;

  const blockedPatterns = [
    /https:\/\/corpus\.noahairmet\.com/i,
    /corpus-access\.html/i,
    /request archive access/i,
    /request access/i,
    />\s*log in\s*</i
  ];

  const matched = blockedPatterns.find((pattern) => pattern.test(html));
  if (matched) {
    throw new Error(`${relativePath} contains public archive access text or links: ${matched}`);
  }
}

function assertNoPublicCursorTrace(relativePath, html) {
  if (!publicPages.includes(relativePath)) return;

  if (/cursor-trace\.js/i.test(html)) {
    throw new Error(`${relativePath} includes cursor-trace.js`);
  }
}

async function assertRequiredCssModules() {
  await Promise.all(
    requiredCssModules.map(async (relativePath) => {
      try {
        await access(path.join(repoRoot, relativePath));
      } catch {
        throw new Error(`Missing required CSS module: ${relativePath}`);
      }
    })
  );
}

function replaceHeader(relativePath, html) {
  const header = renderHeader(relativePath);
  if (generatedHeaderPattern.test(html)) {
    return html.replace(generatedHeaderPattern, header);
  }

  if (legacyHeaderPattern.test(html)) {
    return html.replace(legacyHeaderPattern, header);
  }

  throw new Error(`${relativePath} is missing a site nav header`);
}

function replaceFooter(relativePath, html) {
  const footer = renderFooter();
  if (generatedFooterPattern.test(html)) {
    return html.replace(generatedFooterPattern, footer);
  }

  if (legacyFooterPattern.test(html)) {
    return html.replace(legacyFooterPattern, footer);
  }

  throw new Error(`${relativePath} is missing a site footer`);
}

await assertRequiredCssModules();

const htmlFiles = await listHtmlFiles(repoRoot);
const changed = [];

for (const filePath of htmlFiles) {
  const relativePath = path.relative(repoRoot, filePath);
  const original = await readFile(filePath, "utf8");
  const next = replaceFooter(relativePath, replaceHeader(relativePath, original));
  assertNoPublicArchiveLinks(relativePath, next);
  assertNoPublicCursorTrace(relativePath, next);

  if (next !== original) {
    changed.push(relativePath);
    if (!checkOnly) {
      await writeFile(filePath, next);
    }
  }
}

if (changed.length) {
  const message = `Shared layout ${checkOnly ? "is out of sync" : "synced"}:\n${changed
    .map((file) => `- ${file}`)
    .join("\n")}`;
  if (checkOnly) {
    throw new Error(message);
  }
  console.log(message);
} else {
  console.log("Shared layout is in sync.");
}
