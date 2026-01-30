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

  let translated: FlattenedStrings;
  try {
    translated = JSON.parse(jsonStr) as FlattenedStrings;
  } catch {
    throw new Error(`Failed to parse translation response as JSON.\nResponse: ${jsonStr.slice(0, 500)}`);
  }

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
