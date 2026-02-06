#!/usr/bin/env bun
import { program } from "commander";
import chalk from "chalk";
import { translate } from "./src/translator";
import type { TranslateOptions } from "./src/types";

program
  .name("i18n-batch-translator")
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
  .option(
    "--missing-only",
    "Only translate keys missing from existing target files (auto-detects existing files)",
    false
  )
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
      missingOnly: opts.missingOnly,
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
