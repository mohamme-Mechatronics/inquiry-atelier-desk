import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// A one-line effect such as `useEffect(() => el.scrollIntoView(), [])` returns the
// call's result. Newer browsers return a Promise from scroll methods, React then
// calls that Promise as the cleanup and the page crashes ("n is not a function").
// Effects must use a block body so they return nothing (or a real cleanup function).
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === "test" ? [] : sourceFiles(full);
    return /\.(tsx?|jsx?)$/.test(name) && !name.endsWith(".gen.ts") ? [full] : [];
  });
}

describe("effects", () => {
  it("never use an expression body that could return a non-function value", () => {
    const offenders = sourceFiles(path.resolve(__dirname, ".."))
      .flatMap((file) =>
        readFileSync(file, "utf8")
          .split("\n")
          .map((line, i) => ({ file, line: i + 1, text: line }))
          .filter(({ text }) => /use(Layout)?Effect\(\s*\(\)\s*=>\s*[^{\s]/.test(text)),
      )
      .map(({ file, line }) => `${path.relative(process.cwd(), file)}:${line}`);

    expect(offenders).toEqual([]);
  });
});
