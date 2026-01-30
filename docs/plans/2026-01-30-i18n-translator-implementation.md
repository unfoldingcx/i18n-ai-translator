# i18n AI Translator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a CLI tool that translates i18n JSON files using OpenAI API with smart section-based batching.

**Architecture:** CLI (commander) → Translator orchestrator → Parser (flatten/unflatten JSON) → OpenAI client (batch translate). Progress output via chalk.

**Tech Stack:** Bun, TypeScript, commander, chalk, openai SDK

---

## Task 1: TypeScript Interfaces

**Files:**
- Create: `src/types.ts`

**Step 1: Create types file**

```typescript
export interface TranslateOptions {
  input: string;
  from: string;
  to: string[];
  output: string;
  model: string;
  verbose: boolean;
  dryRun: boolean;
}

export interface FlattenedStrings {
  [key: string]: string;
}

export interface GroupedStrings {
  [section: string]: FlattenedStrings;
}

export interface TranslationResult {
  language: string;
  translations: FlattenedStrings;
}
```

**Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add TypeScript interfaces for translator"
```

---

## Task 2: Parser - Flatten Function

**Files:**
- Create: `src/parser.ts`
- Create: `src/parser.test.ts`

**Step 1: Write the failing test for flatten**

```typescript
import { describe, test, expect } from "bun:test";
import { flatten } from "./parser";

describe("flatten", () => {
  test("flattens nested object to dot notation", () => {
    const input = {
      auth: {
        login: {
          title: "Entrar",
          button: "Login",
        },
      },
      nav: {
        home: "Home",
      },
    };

    const result = flatten(input);

    expect(result).toEqual({
      "auth.login.title": "Entrar",
      "auth.login.button": "Login",
      "nav.home": "Home",
    });
  });

  test("handles single level object", () => {
    const input = { title: "Hello" };
    const result = flatten(input);
    expect(result).toEqual({ title: "Hello" });
  });

  test("handles empty object", () => {
    const result = flatten({});
    expect(result).toEqual({});
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/parser.test.ts`
Expected: FAIL with "flatten is not defined" or similar

**Step 3: Write minimal implementation**

```typescript
import type { FlattenedStrings } from "./types";

export function flatten(
  obj: Record<string, unknown>,
  prefix = ""
): FlattenedStrings {
  const result: FlattenedStrings = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flatten(value as Record<string, unknown>, newKey));
    } else {
      result[newKey] = String(value);
    }
  }

  return result;
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/parser.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/parser.ts src/parser.test.ts
git commit -m "feat: add flatten function for nested JSON"
```

---

## Task 3: Parser - Unflatten Function

**Files:**
- Modify: `src/parser.ts`
- Modify: `src/parser.test.ts`

**Step 1: Write the failing test for unflatten**

Add to `src/parser.test.ts`:

```typescript
import { flatten, unflatten } from "./parser";

describe("unflatten", () => {
  test("unflattens dot notation to nested object", () => {
    const input = {
      "auth.login.title": "Entrar",
      "auth.login.button": "Login",
      "nav.home": "Home",
    };

    const result = unflatten(input);

    expect(result).toEqual({
      auth: {
        login: {
          title: "Entrar",
          button: "Login",
        },
      },
      nav: {
        home: "Home",
      },
    });
  });

  test("handles single level keys", () => {
    const input = { title: "Hello" };
    const result = unflatten(input);
    expect(result).toEqual({ title: "Hello" });
  });

  test("roundtrip: flatten then unflatten returns original", () => {
    const original = {
      auth: {
        login: { title: "Entrar" },
      },
      nav: { home: "Home" },
    };

    const result = unflatten(flatten(original));
    expect(result).toEqual(original);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/parser.test.ts`
Expected: FAIL with "unflatten is not defined"

**Step 3: Write minimal implementation**

Add to `src/parser.ts`:

```typescript
export function unflatten(flat: FlattenedStrings): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let current = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  return result;
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/parser.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/parser.ts src/parser.test.ts
git commit -m "feat: add unflatten function for nested JSON"
```

---

## Task 4: Parser - Group By Section Function

**Files:**
- Modify: `src/parser.ts`
- Modify: `src/parser.test.ts`

**Step 1: Write the failing test for groupBySection**

Add to `src/parser.test.ts`:

```typescript
import { flatten, unflatten, groupBySection } from "./parser";

describe("groupBySection", () => {
  test("groups flattened keys by top-level section", () => {
    const input = {
      "auth.login.title": "Entrar",
      "auth.logout.button": "Sair",
      "nav.home": "Home",
      "nav.settings": "Config",
    };

    const result = groupBySection(input);

    expect(result).toEqual({
      auth: {
        "login.title": "Entrar",
        "logout.button": "Sair",
      },
      nav: {
        home: "Home",
        settings: "Config",
      },
    });
  });

  test("handles single-level keys as their own section", () => {
    const input = {
      title: "Hello",
      "auth.login": "Login",
    };

    const result = groupBySection(input);

    expect(result).toEqual({
      title: { "": "Hello" },
      auth: { login: "Login" },
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/parser.test.ts`
Expected: FAIL with "groupBySection is not defined"

**Step 3: Write minimal implementation**

Add to `src/parser.ts`:

```typescript
import type { FlattenedStrings, GroupedStrings } from "./types";

export function groupBySection(flat: FlattenedStrings): GroupedStrings {
  const result: GroupedStrings = {};

  for (const [key, value] of Object.entries(flat)) {
    const dotIndex = key.indexOf(".");
    let section: string;
    let remainder: string;

    if (dotIndex === -1) {
      section = key;
      remainder = "";
    } else {
      section = key.slice(0, dotIndex);
      remainder = key.slice(dotIndex + 1);
    }

    if (!result[section]) {
      result[section] = {};
    }

    result[section][remainder] = value;
  }

  return result;
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/parser.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/parser.ts src/parser.test.ts
git commit -m "feat: add groupBySection function for batch organization"
```

---

## Task 5: Parser - Ungroup From Sections Function

**Files:**
- Modify: `src/parser.ts`
- Modify: `src/parser.test.ts`

**Step 1: Write the failing test for ungroupFromSections**

Add to `src/parser.test.ts`:

```typescript
import { flatten, unflatten, groupBySection, ungroupFromSections } from "./parser";

describe("ungroupFromSections", () => {
  test("ungroups sections back to flat structure", () => {
    const input = {
      auth: {
        "login.title": "Entrar",
        "logout.button": "Sair",
      },
      nav: {
        home: "Home",
      },
    };

    const result = ungroupFromSections(input);

    expect(result).toEqual({
      "auth.login.title": "Entrar",
      "auth.logout.button": "Sair",
      "nav.home": "Home",
    });
  });

  test("handles empty remainder keys", () => {
    const input = {
      title: { "": "Hello" },
    };

    const result = ungroupFromSections(input);

    expect(result).toEqual({
      title: "Hello",
    });
  });

  test("roundtrip: groupBySection then ungroupFromSections returns original", () => {
    const original = {
      "auth.login.title": "Entrar",
      "nav.home": "Home",
    };

    const result = ungroupFromSections(groupBySection(original));
    expect(result).toEqual(original);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/parser.test.ts`
Expected: FAIL with "ungroupFromSections is not defined"

**Step 3: Write minimal implementation**

Add to `src/parser.ts`:

```typescript
export function ungroupFromSections(grouped: GroupedStrings): FlattenedStrings {
  const result: FlattenedStrings = {};

  for (const [section, strings] of Object.entries(grouped)) {
    for (const [remainder, value] of Object.entries(strings)) {
      const key = remainder === "" ? section : `${section}.${remainder}`;
      result[key] = value;
    }
  }

  return result;
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/parser.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/parser.ts src/parser.test.ts
git commit -m "feat: add ungroupFromSections function"
```

---

## Task 6: OpenAI Client

**Files:**
- Create: `src/openai.ts`

**Step 1: Create OpenAI client wrapper**

```typescript
import OpenAI from "openai";
import type { FlattenedStrings } from "./types";

let client: OpenAI | null = null;

export function initOpenAI(): void {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  client = new OpenAI({
    apiKey,
    organization: process.env.OPENAI_ORG_ID,
  });
}

export async function translateBatch(
  strings: FlattenedStrings,
  fromLang: string,
  toLang: string,
  section: string,
  model: string
): Promise<FlattenedStrings> {
  if (!client) {
    throw new Error("OpenAI client not initialized. Call initOpenAI() first.");
  }

  const prompt = `You are a professional translator. Translate the following i18n strings from ${fromLang} to ${toLang}.

Rules:
- Translate ONLY the values, preserve the keys exactly as given
- Preserve placeholders like {{name}}, {{count}}, etc. unchanged
- Maintain the same tone and formality level
- Return ONLY valid JSON with the same keys

Section context: "${section}" (related UI strings)

Input JSON:
${JSON.stringify(strings, null, 2)}

Output the translated JSON only, no explanation:`;

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const translated = JSON.parse(jsonStr) as FlattenedStrings;

  // Validate all keys are present
  const inputKeys = Object.keys(strings).sort();
  const outputKeys = Object.keys(translated).sort();
  if (JSON.stringify(inputKeys) !== JSON.stringify(outputKeys)) {
    throw new Error(
      `Translation response keys don't match input keys.\nExpected: ${inputKeys.join(", ")}\nGot: ${outputKeys.join(", ")}`
    );
  }

  return translated;
}
```

**Step 2: Commit**

```bash
git add src/openai.ts
git commit -m "feat: add OpenAI client wrapper with translateBatch"
```

---

## Task 7: Translator - Core Logic

**Files:**
- Create: `src/translator.ts`

**Step 1: Create translator module**

```typescript
import { readdir, mkdir } from "node:fs/promises";
import chalk from "chalk";
import type { TranslateOptions, FlattenedStrings, GroupedStrings } from "./types";
import { flatten, unflatten, groupBySection, ungroupFromSections } from "./parser";
import { initOpenAI, translateBatch } from "./openai";

export async function translate(options: TranslateOptions): Promise<void> {
  const { input, from, to, output, model, verbose, dryRun } = options;

  // Load input file
  const inputFile = Bun.file(input);
  if (!(await inputFile.exists())) {
    throw new Error(`Input file not found: ${input}`);
  }

  const inputJson = await inputFile.json();
  if (typeof inputJson !== "object" || inputJson === null || Array.isArray(inputJson)) {
    throw new Error("Input file must contain a JSON object");
  }

  // Flatten and group
  const flattened = flatten(inputJson as Record<string, unknown>);
  const stringCount = Object.keys(flattened).length;
  const grouped = groupBySection(flattened);
  const sectionCount = Object.keys(grouped).length;

  console.log(chalk.green("✓") + ` Loaded ${input} (${stringCount} strings)`);
  console.log(chalk.green("✓") + ` Grouped into ${sectionCount} sections`);

  if (dryRun) {
    console.log("\n" + chalk.yellow("Dry run mode - no API calls will be made"));
    console.log("\nSections:");
    for (const [section, strings] of Object.entries(grouped)) {
      console.log(`  - ${section}: ${Object.keys(strings).length} strings`);
    }
    console.log(`\nWould translate to: ${to.join(", ")}`);
    console.log(`Would create files in: ${output}/`);
    return;
  }

  // Initialize OpenAI
  initOpenAI();

  // Ensure output directory exists
  await mkdir(output, { recursive: true });

  // Translate to each target language
  for (const targetLang of to) {
    console.log(`\nTranslating to ${chalk.cyan(targetLang)}...`);

    const translatedGrouped: GroupedStrings = {};

    for (const [section, strings] of Object.entries(grouped)) {
      const count = Object.keys(strings).length;
      if (verbose) {
        process.stdout.write(`  ${section} (${count} strings)...`);
      }

      const translated = await translateBatch(strings, from, targetLang, section, model);
      translatedGrouped[section] = translated;

      if (verbose) {
        console.log(chalk.green(" ✓"));
      } else {
        console.log(chalk.green("  ✓") + ` ${section} (${count} strings)`);
      }
    }

    // Reconstruct nested structure
    const translatedFlat = ungroupFromSections(translatedGrouped);
    const translatedNested = unflatten(translatedFlat);

    // Write output file
    const outputPath = `${output}/${targetLang}.json`;
    await Bun.write(outputPath, JSON.stringify(translatedNested, null, 2) + "\n");
    console.log(chalk.green("✓") + ` Saved ${outputPath}`);
  }

  console.log(chalk.green(`\nDone! Translated to ${to.length} language(s).`));
}
```

**Step 2: Commit**

```bash
git add src/translator.ts
git commit -m "feat: add translator orchestration logic"
```

---

## Task 8: CLI Entry Point

**Files:**
- Modify: `index.ts`

**Step 1: Replace index.ts with CLI**

```typescript
import { program } from "commander";
import chalk from "chalk";
import { translate } from "./src/translator";
import type { TranslateOptions } from "./src/types";

program
  .name("i18n-ai-translator")
  .description("Translate i18n JSON files using OpenAI API")
  .version("1.0.0");

program
  .command("translate")
  .description("Translate an i18n JSON file to one or more languages")
  .requiredOption("-i, --input <path>", "Path to source i18n JSON file")
  .requiredOption("-f, --from <lang>", "Source language code (e.g., pt-BR)")
  .requiredOption(
    "-t, --to <langs>",
    "Comma-separated target language codes (e.g., es-AR,en-US)"
  )
  .requiredOption("-o, --output <dir>", "Output directory for translated files")
  .option("-m, --model <model>", "OpenAI model to use", "gpt-4o")
  .option("-v, --verbose", "Show detailed progress", false)
  .option("--dry-run", "Parse and validate without calling API", false)
  .action(async (opts) => {
    console.log(chalk.bold("\ni18n AI Translator\n"));

    const options: TranslateOptions = {
      input: opts.input,
      from: opts.from,
      to: opts.to.split(",").map((s: string) => s.trim()),
      output: opts.output,
      model: opts.model,
      verbose: opts.verbose,
      dryRun: opts.dryRun,
    };

    try {
      await translate(options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red("\n✗ Error: ") + message);
      process.exit(1);
    }
  });

program.parse();
```

**Step 2: Commit**

```bash
git add index.ts
git commit -m "feat: add CLI with commander"
```

---

## Task 9: Manual Integration Test

**Step 1: Create .env file (if not exists)**

```bash
echo "OPENAI_API_KEY=your-key-here" > .env
```

**Step 2: Run dry-run test**

Run: `bun run index.ts translate -i ./samples/pt-BR.json -f pt-BR -t es-AR,en-US -o ./locales --dry-run`

Expected output:
```
i18n AI Translator

✓ Loaded ./samples/pt-BR.json (N strings)
✓ Grouped into N sections

Dry run mode - no API calls will be made

Sections:
  - app: N strings
  - auth: N strings
  ...

Would translate to: es-AR, en-US
Would create files in: ./locales/
```

**Step 3: Run real translation (requires valid API key)**

Run: `bun run index.ts translate -i ./samples/pt-BR.json -f pt-BR -t en-US -o ./locales`

Expected: Creates `./locales/en-US.json` with translated content.

**Step 4: Verify help output**

Run: `bun run index.ts translate --help`

Expected: Shows all options with descriptions.

---

## Task 10: Add locales to .gitignore

**Files:**
- Create or modify: `.gitignore`

**Step 1: Add .gitignore entries**

```
# Dependencies
node_modules/

# Output
locales/

# Environment
.env
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .gitignore for locales and env"
```

---

## Summary

After completing all tasks, the project structure will be:

```
i18n-ai-translator/
├── index.ts              # CLI entry point
├── src/
│   ├── types.ts          # TypeScript interfaces
│   ├── parser.ts         # JSON flatten/unflatten/group utilities
│   ├── parser.test.ts    # Parser tests
│   ├── openai.ts         # OpenAI client wrapper
│   └── translator.ts     # Translation orchestration
├── samples/
│   └── pt-BR.json        # Example input
├── docs/plans/
│   ├── 2026-01-30-i18n-translator-design.md
│   └── 2026-01-30-i18n-translator-implementation.md
├── .gitignore
├── .env                  # (not committed)
└── package.json
```
