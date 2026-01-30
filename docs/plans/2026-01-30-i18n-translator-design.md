# i18n AI Translator - Design Document

## Overview

A CLI tool that translates i18n JSON files using OpenAI API. Translates values only (preserving keys), maintains placeholder parameters like `{{name}}`, and supports multiple target languages in a single run.

## CLI Interface

```bash
bun run index.ts translate \
  --input ./samples/pt-BR.json \
  --from pt-BR \
  --to es-AR,en-US,fr-FR \
  --output ./locales \
  --model gpt-4o
```

### Required Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--input` | `-i` | Path to source i18n JSON file |
| `--from` | `-f` | Source language code (e.g., `pt-BR`) |
| `--to` | `-t` | Comma-separated target language codes |
| `--output` | `-o` | Output directory (files created as `{lang}.json`) |

### Optional Options

| Option | Alias | Default | Description |
|--------|-------|---------|-------------|
| `--model` | `-m` | `gpt-4o` | OpenAI model to use |
| `--verbose` | `-v` | `false` | Show detailed progress |
| `--dry-run` | | `false` | Parse and validate without calling API |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `OPENAI_ORG_ID` | No | OpenAI organization ID |

### Output

Files are created in the output directory named after each target language:

```
./locales/
  es-AR.json
  en-US.json
  fr-FR.json
```

## Translation Engine

### Smart Batching Strategy

The tool walks the nested JSON structure and groups strings by their top-level section:

```
auth.login.title        → batch "auth"
auth.login.subtitle     → batch "auth"
auth.logout.button      → batch "auth"
navigation.home         → batch "navigation"
navigation.collections  → batch "navigation"
```

Each batch is sent to OpenAI as a single request with context about the section. This provides:
- Better context for consistent terminology within a section
- More efficient than one-by-one translation
- More reliable than batching the entire file

### Prompt Design

```
You are a professional translator. Translate the following i18n strings
from {sourceLanguage} to {targetLanguage}.

Rules:
- Translate ONLY the values, preserve the keys exactly
- Preserve placeholders like {{name}}, {{count}} unchanged
- Maintain the same tone and formality level
- Return valid JSON with the same structure

Section: "{sectionName}" ({sectionDescription})

Input:
{jsonStrings}
```

### Parameter Preservation

Placeholders matching `{{param}}` pattern are:
1. Explicitly mentioned in the prompt
2. Validated in the output to ensure they weren't modified or removed

## Code Architecture

### File Structure

```
i18n-ai-translator/
├── index.ts              # CLI entry point (commander setup)
├── src/
│   ├── translator.ts     # Core translation logic
│   ├── openai.ts         # OpenAI client wrapper
│   ├── parser.ts         # JSON parsing, flattening, unflattening
│   └── types.ts          # TypeScript interfaces
├── samples/
│   └── pt-BR.json        # Example input
└── package.json
```

### Module Responsibilities

#### `parser.ts`

Handles nested JSON transformations:

- `flatten(obj)` — Converts nested object to flat key-value pairs
  - Input: `{ auth: { login: { title: "Entrar" } } }`
  - Output: `{ "auth.login.title": "Entrar" }`

- `groupBySection(flat)` — Groups flat keys by top-level section
  - Input: `{ "auth.login.title": "...", "nav.home": "..." }`
  - Output: `{ auth: { "login.title": "..." }, nav: { "home": "..." } }`

- `unflatten(flat)` — Reconstructs nested structure from flat object

#### `openai.ts`

Thin wrapper around OpenAI SDK:

- Initializes client with API key and optional org ID
- Exports `translateBatch(strings, from, to, section, model)` function
- Returns translated key-value pairs
- Handles JSON parsing of response

#### `translator.ts`

Orchestrates the translation flow:

1. Load and parse input JSON
2. Flatten and group by section
3. For each target language:
   - Translate all sections via OpenAI
   - Unflatten results
   - Write output file
4. Report progress

#### `index.ts`

CLI entry point only:

- Parse arguments with commander
- Validate inputs (file exists, env vars set)
- Call translator
- Display progress with chalk
- Handle and display errors

## Validation

### Input Validation

- Input file exists and is valid JSON
- Input is an object (not array or primitive)
- `OPENAI_API_KEY` environment variable is set
- Output directory exists or can be created
- Language codes are non-empty strings

### Output Validation

- Translated JSON maintains same structure as input
- All `{{placeholder}}` parameters are preserved

## Error Handling

Fail-fast approach:

- Stop on first API error
- Display clear error message with context
- User retries manually

## Progress Output

### Normal Run

```
i18n AI Translator

✓ Loaded ./samples/pt-BR.json (486 strings)
✓ Grouped into 12 sections

Translating to es-AR...
  ✓ auth (21 strings)
  ✓ navigation (7 strings)
  ✓ menu (12 strings)
  ...
✓ Saved ./locales/es-AR.json

Translating to en-US...
  ✓ auth (21 strings)
  ...
✓ Saved ./locales/en-US.json

Done! Translated to 2 languages.
```

### Error

```
✗ Error translating section "collections" to es-AR
  OpenAI API error: Rate limit exceeded

Run again to retry.
```

### Dry Run

With `--dry-run`, parses input and shows section breakdown without calling API:

```
i18n AI Translator (dry run)

✓ Loaded ./samples/pt-BR.json (486 strings)
✓ Grouped into 12 sections:
  - auth: 21 strings
  - navigation: 7 strings
  - menu: 12 strings
  ...

Would translate to: es-AR, en-US
Would create files in: ./locales/
```
