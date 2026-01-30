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
