import { mkdir } from "node:fs/promises";
import chalk from "chalk";
import type { TranslateOptions, GroupedStrings, FlattenedStrings } from "./types";
import { flatten, unflatten, groupBySection, ungroupFromSections } from "./parser";
import { initOpenAI, translateBatch } from "./openai";

/**
 * Filters a grouped strings object to only include keys present in the allowedKeys set.
 */
function filterGroupedByKeys(
  grouped: GroupedStrings,
  allowedKeys: Set<string>
): GroupedStrings {
  const filtered: GroupedStrings = {};

  for (const [section, strings] of Object.entries(grouped)) {
    const filteredStrings: FlattenedStrings = {};

    for (const [remainder, value] of Object.entries(strings)) {
      const fullKey = remainder === "" ? section : `${section}.${remainder}`;
      if (allowedKeys.has(fullKey)) {
        filteredStrings[remainder] = value;
      }
    }

    if (Object.keys(filteredStrings).length > 0) {
      filtered[section] = filteredStrings;
    }
  }

  return filtered;
}

export async function translate(options: TranslateOptions): Promise<void> {
  const { input, from, to, output, model, verbose, dryRun, missingOnly } = options;

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

  if (missingOnly) {
    console.log(chalk.cyan("ℹ") + " Missing-only mode: will skip already translated keys");
  }

  if (dryRun) {
    console.log("\n" + chalk.yellow("Dry run mode - no API calls will be made"));
    console.log("\nSections:");
    for (const [section, strings] of Object.entries(grouped)) {
      console.log(`  - ${section}: ${Object.keys(strings).length} strings`);
    }
    console.log(`\nWould translate to: ${to.join(", ")}`);
    console.log(`Would create files in: ${output}/`);

    if (missingOnly) {
      for (const targetLang of to) {
        const outputPath = `${output}/${targetLang}.json`;
        const targetFile = Bun.file(outputPath);
        if (await targetFile.exists()) {
          const targetJson = await targetFile.json();
          const targetFlat = flatten(targetJson as Record<string, unknown>);
          const targetKeys = new Set(Object.keys(targetFlat));
          const missingKeys = Object.keys(flattened).filter((k) => !targetKeys.has(k));
          console.log(
            `  ${chalk.cyan(targetLang)}: ${missingKeys.length} missing keys (${targetKeys.size} already translated)`
          );
        } else {
          console.log(`  ${chalk.cyan(targetLang)}: new file (${stringCount} keys to translate)`);
        }
      }
    }
    return;
  }

  // Initialize OpenAI
  initOpenAI();

  // Ensure output directory exists
  await mkdir(output, { recursive: true });

  // Translate to each target language
  for (const targetLang of to) {
    const outputPath = `${output}/${targetLang}.json`;
    let existingFlat: FlattenedStrings = {};
    let toTranslateGrouped = grouped;

    // In missing-only mode, detect existing files and compute what's missing
    if (missingOnly) {
      const targetFile = Bun.file(outputPath);

      if (await targetFile.exists()) {
        const targetJson = await targetFile.json();
        if (typeof targetJson === "object" && targetJson !== null && !Array.isArray(targetJson)) {
          existingFlat = flatten(targetJson as Record<string, unknown>);
          const existingKeys = new Set(Object.keys(existingFlat));

          // Find keys in source that don't exist in target
          const missingKeys = Object.keys(flattened).filter((k) => !existingKeys.has(k));

          if (missingKeys.length === 0) {
            console.log(
              `\n${chalk.green("✓")} ${chalk.cyan(targetLang)}: all ${existingKeys.size} keys already translated, skipping`
            );
            continue;
          }

          // Filter grouped to only include missing keys
          const missingKeySet = new Set(missingKeys);
          toTranslateGrouped = filterGroupedByKeys(grouped, missingKeySet);

          console.log(
            `\nTranslating ${chalk.yellow(String(missingKeys.length))} missing keys to ${chalk.cyan(targetLang)} (${existingKeys.size} already exist)...`
          );
        }
      } else {
        console.log(`\nTranslating to ${chalk.cyan(targetLang)} (new file)...`);
      }
    } else {
      console.log(`\nTranslating to ${chalk.cyan(targetLang)}...`);
    }

    const translatedGrouped: GroupedStrings = {};

    for (const [section, strings] of Object.entries(toTranslateGrouped)) {
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

    // Merge with existing translations if in missing-only mode
    const mergedFlat = { ...existingFlat, ...translatedFlat };
    const mergedNested = unflatten(mergedFlat);

    // Write output file
    await Bun.write(outputPath, JSON.stringify(mergedNested, null, 2) + "\n");

    if (missingOnly && Object.keys(existingFlat).length > 0) {
      console.log(
        chalk.green("✓") +
        ` Merged ${Object.keys(translatedFlat).length} new keys into ${outputPath} (total: ${Object.keys(mergedFlat).length})`
      );
    } else {
      console.log(chalk.green("✓") + ` Saved ${outputPath}`);
    }
  }

  console.log(chalk.green(`\nDone! Translated to ${to.length} language(s).`));
}
