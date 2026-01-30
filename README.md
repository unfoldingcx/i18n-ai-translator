# I18N Batch Translator (AI)

A CLI tool that translates i18n JSON files using OpenAI API with smart section-based batching for context-aware translations.

## Features

- **Smart Batching**: Groups strings by top-level section (e.g., `auth`, `navigation`) for better translation context and terminology consistency
- **Multiple Languages**: Translate to multiple target languages in a single command
- **Placeholder Preservation**: Automatically preserves template variables like `{{name}}`, `{{count}}`
- **Dry Run Mode**: Validate your input files without making API calls
- **Nested JSON Support**: Handles deeply nested i18n structures
- **Progress Feedback**: Real-time progress with section-by-section updates

## Installation

### Using Bun (recommended)

```bash
bun install -g i18n-batch-translator
```

### Using npm

```bash
npm install -g i18n-batch-translator
```

## Configuration

Set your OpenAI API key as an environment variable:

```bash
export OPENAI_API_KEY=your-api-key-here
```

Optionally, set your OpenAI organization ID:

```bash
export OPENAI_ORG_ID=your-org-id-here
```

You can also create a `.env` file in your project root:

```env
OPENAI_API_KEY=your-api-key-here
OPENAI_ORG_ID=your-org-id-here
```

## Usage

### Basic Translation

Translate a Portuguese (pt-BR) file to English and Spanish:

```bash
i18n-batch-translator translate \
  --input ./locales/pt-BR.json \
  --from pt-BR \
  --to en-US,es-AR \
  --output ./locales
```

This creates `./locales/en-US.json` and `./locales/es-AR.json`.

### Dry Run

Preview what will be translated without making API calls:

```bash
i18n-batch-translator translate \
  --input ./locales/pt-BR.json \
  --from pt-BR \
  --to en-US,es-AR,fr-FR \
  --output ./locales \
  --dry-run
```

Output:

```
i18n AI Translator

✓ Loaded ./locales/pt-BR.json (376 strings)
✓ Grouped into 14 sections

Dry run mode - no API calls will be made

Sections:
  - app: 2 strings
  - auth: 10 strings
  - navigation: 7 strings
  - home: 10 strings
  ...

Would translate to: en-US, es-AR, fr-FR
Would create files in: ./locales/
```

### Using a Different Model

Use GPT-4o-mini for faster, cheaper translations:

```bash
i18n-batch-translator translate \
  --input ./locales/pt-BR.json \
  --from pt-BR \
  --to en-US \
  --output ./locales \
  --model gpt-4o-mini
```

### Verbose Mode

See detailed progress for each section:

```bash
i18n-batch-translator translate \
  --input ./locales/pt-BR.json \
  --from pt-BR \
  --to en-US \
  --output ./locales \
  --verbose
```

## CLI Options

```
Usage: i18n-batch-translator translate [options]

Translate an i18n JSON file to one or more languages

Options:
  -i, --input <path>   Path to source i18n JSON file (required)
  -f, --from <lang>    Source language code, e.g., pt-BR (required)
  -t, --to <langs>     Comma-separated target language codes (required)
  -o, --output <dir>   Output directory for translated files (required)
  -m, --model <model>  OpenAI model to use (default: "gpt-4o")
  -v, --verbose        Show detailed progress (default: false)
  --dry-run            Parse and validate without calling API (default: false)
  -h, --help           Display help for command
```

## Input Format

The tool accepts nested JSON files commonly used in i18n libraries like `react-i18next`, `vue-i18n`, or `next-intl`:

```json
{
  "auth": {
    "login": {
      "title": "Sign In",
      "button": "Continue with {{provider}}",
      "error": "Authentication failed. Please try again."
    },
    "logout": {
      "button": "Sign Out",
      "confirm": "Are you sure you want to sign out?"
    }
  },
  "navigation": {
    "home": "Home",
    "settings": "Settings"
  }
}
```

## How It Works

### Smart Section-Based Batching

Instead of translating strings one by one or all at once, the tool groups strings by their top-level section:

```
auth.login.title      → batch "auth"
auth.login.button     → batch "auth"
auth.logout.button    → batch "auth"
navigation.home       → batch "navigation"
navigation.settings   → batch "navigation"
```

Each batch is sent to OpenAI with context about the section, resulting in:

- **Better terminology consistency** within each section
- **Reduced API costs** compared to one-by-one translation
- **More reliable results** than translating the entire file at once

### Placeholder Preservation

The tool instructs OpenAI to preserve template placeholders:

- `{{name}}` stays as `{{name}}`
- `{{count}}` stays as `{{count}}`
- `%{variable}` stays as `%{variable}`

It also validates that all placeholders in the source are present in the translation.

## Output

Output files maintain the exact same structure as the input:

**Input (`pt-BR.json`):**

```json
{
  "auth": {
    "login": {
      "title": "Entrar",
      "button": "Continuar com {{provider}}"
    }
  }
}
```

**Output (`en-US.json`):**

```json
{
  "auth": {
    "login": {
      "title": "Sign In",
      "button": "Continue with {{provider}}"
    }
  }
}
```

## Error Handling

The tool fails fast on errors with clear messages:

```
✗ Error: Input file not found: ./locales/missing.json
```

```
✗ Error: OPENAI_API_KEY environment variable is required
```

```
✗ Error: Translation response keys don't match input keys.
Expected: title, button
Got: title, btn
```

## Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.0

### Setup

```bash
git clone https://github.com/yourusername/i18n-batch-translator.git
cd i18n-batch-translator
bun install
```

### Running Tests

```bash
bun test
```

### Running Locally

```bash
bun run index.ts translate --help
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
