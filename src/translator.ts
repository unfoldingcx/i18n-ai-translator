import { mkdir } from "node:fs/promises";
import chalk from "chalk";
import type { TranslateOptions, GroupedStrings } from "./types";
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
