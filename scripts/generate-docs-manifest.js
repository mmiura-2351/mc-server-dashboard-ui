const fs = require("fs");
const path = require("path");

/**
 * Simple frontmatter parser for build script
 */
function parseFrontmatter(content) {
  const lines = content.split("\n");
  let frontmatterLines = [];
  let contentLines = [];
  let inFrontmatter = false;
  let frontmatterEnded = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (i === 0 && line === "---") {
      inFrontmatter = true;
      continue;
    }

    if (inFrontmatter && line === "---") {
      inFrontmatter = false;
      frontmatterEnded = true;
      continue;
    }

    if (inFrontmatter) {
      frontmatterLines.push(line);
    } else if (frontmatterEnded) {
      contentLines.push(line);
    } else if (!inFrontmatter && i === 0 && line !== "---") {
      contentLines.push(line);
      frontmatterEnded = true;
    }
  }

  // Parse YAML-like frontmatter
  const frontmatter = {};
  frontmatterLines.forEach((line) => {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (value.match(/^\d+$/)) {
        frontmatter[key] = parseInt(value, 10);
      } else if (value === "true" || value === "false") {
        frontmatter[key] = value === "true";
      } else {
        frontmatter[key] = value.replace(/^["']|["']$/g, "");
      }
    }
  });

  return {
    frontmatter,
    content: contentLines.join("\n").trim(),
  };
}

/**
 * Validates frontmatter fields
 */
function validateFrontmatter(frontmatter, filePath) {
  const requiredFields = [
    "slug",
    "title",
    "description",
    "category",
    "order",
    "lastUpdated",
  ];

  for (const field of requiredFields) {
    if (!frontmatter[field]) {
      throw new Error(
        `Missing required frontmatter field "${field}" in ${filePath}`
      );
    }
  }

  if (typeof frontmatter.order !== "number") {
    throw new Error(`"order" must be a number in ${filePath}`);
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(frontmatter.lastUpdated)) {
    throw new Error(
      `"lastUpdated" must be in YYYY-MM-DD format in ${filePath}`
    );
  }

  return frontmatter;
}

/**
 * Generates manifest.json for documentation
 */
function generateDocsManifest(docsDir, outputPath, categoryOrderFile) {
  console.log(`Generating docs manifest for ${docsDir}`);

  // Load category order
  let categoryOrder = [];
  if (fs.existsSync(categoryOrderFile)) {
    const config = JSON.parse(fs.readFileSync(categoryOrderFile, "utf8"));
    categoryOrder = config.categories || [];
  }

  // Find all markdown files
  const markdownFiles = fs
    .readdirSync(docsDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => path.join(docsDir, file));

  const documents = [];

  for (const filePath of markdownFiles) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const { frontmatter } = parseFrontmatter(content);

      // Skip if frontmatter is empty or document is draft
      if (Object.keys(frontmatter).length === 0) {
        console.warn(`No frontmatter found in ${filePath}, skipping`);
        continue;
      }

      if (frontmatter.draft === true) {
        console.log(`Skipping draft document: ${filePath}`);
        continue;
      }

      // Validate frontmatter
      const validatedFrontmatter = validateFrontmatter(frontmatter, filePath);
      documents.push(validatedFrontmatter);
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
      process.exit(1);
    }
  }

  // Sort documents by category order, then by order within category
  documents.sort((a, b) => {
    // First sort by category order
    const aCategoryIndex = categoryOrder.indexOf(a.category);
    const bCategoryIndex = categoryOrder.indexOf(b.category);

    // If category is not in order list, put it at the end
    const aIndex = aCategoryIndex === -1 ? categoryOrder.length : aCategoryIndex;
    const bIndex = bCategoryIndex === -1 ? categoryOrder.length : bCategoryIndex;

    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    // If same category, sort by order field
    return a.order - b.order;
  });

  // Generate manifest
  const manifest = {
    documents,
  };

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write manifest
  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  console.log(`Generated manifest: ${outputPath} (${documents.length} documents)`);
}

// Webpack plugin class
class DocsManifestPlugin {
  constructor(options = {}) {
    this.options = {
      docsDir: options.docsDir || "public/docs",
      categoryOrderFile: options.categoryOrderFile || "docs.config.json",
      ...options,
    };
  }

  apply(compiler) {
    compiler.hooks.beforeCompile.tap("DocsManifestPlugin", () => {
      const { docsDir, categoryOrderFile } = this.options;

      // Find all locale directories
      const locales = fs
        .readdirSync(docsDir)
        .filter((item) => {
          const itemPath = path.join(docsDir, item);
          return fs.statSync(itemPath).isDirectory();
        });

      // Generate manifest for each locale
      for (const locale of locales) {
        const localeDocsDir = path.join(docsDir, locale);
        const outputPath = path.join(localeDocsDir, "manifest.json");

        try {
          generateDocsManifest(localeDocsDir, outputPath, categoryOrderFile);
        } catch (error) {
          console.error(`Failed to generate manifest for ${locale}:`, error);
          throw error;
        }
      }
    });
  }
}

module.exports = { DocsManifestPlugin, generateDocsManifest };

// If run directly from command line
if (require.main === module) {
  const docsDir = process.argv[2] || "public/docs";
  const categoryOrderFile = process.argv[3] || "docs.config.json";

  if (!fs.existsSync(docsDir)) {
    console.error(`Docs directory not found: ${docsDir}`);
    process.exit(1);
  }

  const locales = fs
    .readdirSync(docsDir)
    .filter((item) => {
      const itemPath = path.join(docsDir, item);
      return fs.statSync(itemPath).isDirectory();
    });

  for (const locale of locales) {
    const localeDocsDir = path.join(docsDir, locale);
    const outputPath = path.join(localeDocsDir, "manifest.json");
    generateDocsManifest(localeDocsDir, outputPath, categoryOrderFile);
  }
}