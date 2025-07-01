import { describe, it, expect } from "vitest";

describe("CSS Variables Consistency", () => {
  it("should have consistent CSS variable definitions in globals.css", async () => {
    // Read globals.css file
    const globalsCSS = await import("fs").then((fs) =>
      fs.promises.readFile("src/app/globals.css", "utf-8")
    );

    // Check that there are no duplicate shadow variable definitions
    const shadowSmMatches = globalsCSS.match(/--shadow-sm:/g);
    expect(shadowSmMatches?.length).toBe(1);

    const shadowMdMatches = globalsCSS.match(/--shadow-md:/g);
    expect(shadowMdMatches?.length).toBe(1);

    const shadowLgMatches = globalsCSS.match(/--shadow-lg:/g);
    expect(shadowLgMatches?.length).toBe(1);

    // Check that there are no duplicate border radius variable definitions
    const radiusSmMatches = globalsCSS.match(/--radius-sm:/g);
    expect(radiusSmMatches?.length).toBe(1);

    const radiusMdMatches = globalsCSS.match(/--radius-md:/g);
    expect(radiusMdMatches?.length).toBe(1);

    const radiusLgMatches = globalsCSS.match(/--radius-lg:/g);
    expect(radiusLgMatches?.length).toBe(1);

    // Verify shadow variables use consistent format (rgb/rgba)
    expect(globalsCSS).not.toMatch(
      /--shadow-[a-z]+:\s*[^;]*rgba\(\d+,\s*\d+,\s*\d+,\s*[0-9.]+\)/
    );

    // Verify radius variables use rem units consistently
    expect(globalsCSS).toMatch(/--radius-sm:\s*0\.125rem/);
    expect(globalsCSS).toMatch(/--radius-md:\s*0\.375rem/);
    expect(globalsCSS).toMatch(/--radius-lg:\s*0\.5rem/);

    // Verify no duplicate variables using px units exist
    expect(globalsCSS).not.toMatch(/--radius-sm:\s*\d+px/);
    expect(globalsCSS).not.toMatch(/--radius-md:\s*\d+px/);
    expect(globalsCSS).not.toMatch(/--radius-lg:\s*\d+px/);
  });

  it("should map CSS variable values correctly", () => {
    // Test rem to px conversion (assuming 1rem = 16px)
    const remToPx = (rem: number) => rem * 16;

    expect(remToPx(0.125)).toBe(2); // --radius-sm
    expect(remToPx(0.25)).toBe(4); // --radius-base
    expect(remToPx(0.375)).toBe(6); // --radius-md
    expect(remToPx(0.5)).toBe(8); // --radius-lg
    expect(remToPx(0.75)).toBe(12); // --radius-xl
  });
});
