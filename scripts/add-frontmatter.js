const fs = require("fs");
const path = require("path");

/**
 * Adds frontmatter to markdown files based on existing manifest.json
 */
function addFrontmatterToMarkdownFiles(docsDir, backupManifestPath) {
  console.log(`Adding frontmatter to markdown files in ${docsDir}`);

  // Read the backup manifest
  if (!fs.existsSync(backupManifestPath)) {
    console.error(`Backup manifest not found: ${backupManifestPath}`);
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(backupManifestPath, "utf8"));
  const documents = manifest.documents || [];

  for (const doc of documents) {
    const markdownPath = path.join(docsDir, `${doc.slug}.md`);

    if (!fs.existsSync(markdownPath)) {
      console.warn(`Markdown file not found: ${markdownPath}`);
      continue;
    }

    // Read existing content
    const content = fs.readFileSync(markdownPath, "utf8");

    // Check if frontmatter already exists
    if (content.startsWith("---")) {
      console.log(`Frontmatter already exists in ${markdownPath}, skipping`);
      continue;
    }

    // Create frontmatter
    const frontmatter = `---
slug: ${doc.slug}
title: ${doc.title}
description: ${doc.description}
category: ${doc.category}
order: ${doc.order}
lastUpdated: ${doc.lastUpdated}
---

`;

    // Prepend frontmatter to content
    const newContent = frontmatter + content;

    // Write the updated file
    fs.writeFileSync(markdownPath, newContent);
    console.log(`Added frontmatter to ${markdownPath}`);
  }
}

// If run directly from command line
if (require.main === module) {
  const locales = ["en", "ja"];

  for (const locale of locales) {
    const docsDir = path.join("public", "docs", locale);
    const backupManifestPath = path.join(docsDir, "manifest.json.backup");
    const manifestPath = path.join(docsDir, "manifest.json");

    // First, backup the existing manifest if not already backed up
    if (fs.existsSync(manifestPath) && !fs.existsSync(backupManifestPath)) {
      fs.copyFileSync(manifestPath, backupManifestPath);
      console.log(`Backed up manifest: ${backupManifestPath}`);
    }

    // Add frontmatter to markdown files using backup manifest
    if (fs.existsSync(backupManifestPath)) {
      addFrontmatterToMarkdownFiles(docsDir, backupManifestPath);
    } else {
      console.warn(`No backup manifest found for ${locale}: ${backupManifestPath}`);
    }
  }

  console.log("\nFrontmatter addition complete!");
  console.log("Run 'npm run docs:generate' to regenerate manifests from frontmatter.");
}