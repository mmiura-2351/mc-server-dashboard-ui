import type { DocsFrontmatter } from "@/types/docs-frontmatter";

/**
 * Parses frontmatter from markdown content
 * Expects frontmatter in YAML format between --- delimiters
 */
export function parseFrontmatter(content: string): {
  frontmatter: DocsFrontmatter;
  content: string;
} {
  const lines = content.split("\n");
  const frontmatterLines: string[] = [];
  const contentLines: string[] = [];
  let inFrontmatter = false;
  let frontmatterEnded = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue; // Skip undefined lines

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
      // Content starts immediately without frontmatter
      contentLines.push(line);
      frontmatterEnded = true;
    } else if (frontmatterEnded) {
      contentLines.push(line);
    }
  }

  // Parse YAML-like frontmatter
  const frontmatter: Record<string, string | number | boolean> = {};
  frontmatterLines.forEach((line) => {
    const match = line.match(/^(\w+):\s*(.*)$/);
    if (match) {
      const [, key, value] = match;
      // Handle different value types - guard against undefined value
      if (key && value !== undefined) {
        if (value.match(/^\d+$/)) {
          frontmatter[key] = parseInt(value, 10);
        } else if (value === "true" || value === "false") {
          frontmatter[key] = value === "true";
        } else {
          // Remove quotes if present
          frontmatter[key] = value.replace(/^["']|["']$/g, "");
        }
      }
    }
  });

  return {
    frontmatter: frontmatter as unknown as DocsFrontmatter,
    content: contentLines.join("\n").trim(),
  };
}

/**
 * Validates frontmatter to ensure required fields are present
 */
export function validateFrontmatter(
  frontmatter: Record<string, unknown>,
  filePath: string
): DocsFrontmatter {
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

  // Validate field types
  if (typeof frontmatter.order !== "number") {
    throw new Error(`"order" must be a number in ${filePath}`);
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const lastUpdated = frontmatter.lastUpdated;
  if (typeof lastUpdated !== "string" || !dateRegex.test(lastUpdated)) {
    throw new Error(
      `"lastUpdated" must be in YYYY-MM-DD format in ${filePath}`
    );
  }

  return frontmatter as unknown as DocsFrontmatter;
}
