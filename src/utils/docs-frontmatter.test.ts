import { describe, expect, it } from "vitest";
import { parseFrontmatter, validateFrontmatter } from "./docs-frontmatter";

describe("parseFrontmatter", () => {
  it("should parse valid frontmatter", () => {
    const markdown = `---
slug: getting-started
title: Getting Started
description: Quick start guide
category: Getting Started
order: 1
lastUpdated: 2025-06-20
---

# Getting Started

This is the content.`;

    const result = parseFrontmatter(markdown);

    expect(result.frontmatter).toEqual({
      slug: "getting-started",
      title: "Getting Started",
      description: "Quick start guide",
      category: "Getting Started",
      order: 1,
      lastUpdated: "2025-06-20",
    });
    expect(result.content).toBe("# Getting Started\n\nThis is the content.");
  });

  it("should handle draft field", () => {
    const markdown = `---
slug: test
title: Test
description: Test doc
category: Test
order: 1
lastUpdated: 2025-01-01
draft: true
---

Content`;

    const result = parseFrontmatter(markdown);
    expect(result.frontmatter.draft).toBe(true);
  });

  it("should handle strings with quotes", () => {
    const markdown = `---
slug: test
title: "Test: With Colon"
description: 'Single quotes work too'
category: Test
order: 1
lastUpdated: 2025-01-01
---

Content`;

    const result = parseFrontmatter(markdown);
    expect(result.frontmatter.title).toBe("Test: With Colon");
    expect(result.frontmatter.description).toBe("Single quotes work too");
  });

  it("should handle content without frontmatter", () => {
    const markdown = `# No Frontmatter

Just content.`;

    const result = parseFrontmatter(markdown);
    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe("# No Frontmatter\n\nJust content.");
  });
});

describe("validateFrontmatter", () => {
  it("should validate correct frontmatter", () => {
    const frontmatter = {
      slug: "test",
      title: "Test",
      description: "Test description",
      category: "Test Category",
      order: 1,
      lastUpdated: "2025-01-01",
    };

    const result = validateFrontmatter(frontmatter, "test.md");
    expect(result).toEqual(frontmatter);
  });

  it("should throw error for missing required fields", () => {
    const frontmatter = {
      slug: "test",
      title: "Test",
      // missing other required fields
    };

    expect(() => validateFrontmatter(frontmatter, "test.md")).toThrow(
      'Missing required frontmatter field "description" in test.md'
    );
  });

  it("should throw error for invalid order type", () => {
    const frontmatter = {
      slug: "test",
      title: "Test",
      description: "Test description",
      category: "Test Category",
      order: "1", // should be number
      lastUpdated: "2025-01-01",
    };

    expect(() => validateFrontmatter(frontmatter, "test.md")).toThrow(
      '"order" must be a number in test.md'
    );
  });

  it("should throw error for invalid date format", () => {
    const frontmatter = {
      slug: "test",
      title: "Test",
      description: "Test description",
      category: "Test Category",
      order: 1,
      lastUpdated: "01/01/2025", // wrong format
    };

    expect(() => validateFrontmatter(frontmatter, "test.md")).toThrow(
      '"lastUpdated" must be in YYYY-MM-DD format in test.md'
    );
  });

  it("should allow optional draft field", () => {
    const frontmatter = {
      slug: "test",
      title: "Test",
      description: "Test description",
      category: "Test Category",
      order: 1,
      lastUpdated: "2025-01-01",
      draft: true,
    };

    const result = validateFrontmatter(frontmatter, "test.md");
    expect(result.draft).toBe(true);
  });
});
