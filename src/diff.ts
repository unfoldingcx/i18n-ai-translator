import fs from "fs"
import path from "path"

type JsonObject = Record<string, unknown>;

const isPlainObject = (value: unknown): value is JsonObject =>
    typeof value === "object" && value !== null && !Array.isArray(value)

const readJson = (filePath: string): JsonObject => {
    const raw = fs.readFileSync(filePath, "utf8")
    const parsed = JSON.parse(raw)
    if (!isPlainObject(parsed)) {
        throw new Error(`Expected object at root of ${filePath}`)
    }
    return parsed
}

const collectKeys = (obj: JsonObject, prefix = ""): string[] => {
    const keys: string[] = []
    for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        if (typeof value === "string") {
            keys.push(fullKey)
        } else if (isPlainObject(value)) {
            keys.push(...collectKeys(value, fullKey))
        }
    }
    return keys
}

/**
 * Finds keys that exist in the main translation file but are missing from ALL other translation files
 * @param mainFilePath - Path to the main/reference translation JSON file
 * @param translationsDir - Directory containing other translation JSON files to compare against
 * @returns Array of keys that exist in main file but are missing from ALL other translation files in the directory
 */
export const findMissingKeys = (mainFilePath: string, translationsDir: string): string[] => {
    if (!fs.existsSync(mainFilePath)) {
        throw new Error(`Main file not found: ${mainFilePath}`)
    }

    if (!fs.existsSync(translationsDir)) {
        throw new Error(`Translations directory not found: ${translationsDir}`)
    }

    const mainData = readJson(mainFilePath)
    const mainKeys = collectKeys(mainData)
    const mainKeySet = new Set(mainKeys)

    // Get all JSON files in the translations directory (excluding the main file)
    const mainFileName = path.basename(mainFilePath)
    const otherFiles = fs
        .readdirSync(translationsDir)
        .filter((file) => file.endsWith(".json") && file !== mainFileName)
        .map((file) => path.join(translationsDir, file))

    // Collect keys from each other translation file
    const otherFilesKeys: string[][] = []
    for (const filePath of otherFiles) {
        if (!fs.existsSync(filePath)) continue

        try {
            const data = readJson(filePath)
            const keys = collectKeys(data)
            otherFilesKeys.push(keys)
        } catch (error) {
            // Skip files that can't be read or parsed
            console.warn(`Skipping invalid file: ${filePath}`, error)
        }
    }

    // Find keys that exist in main but are missing from ALL other files
    const missingKeys: string[] = []
    for (const key of mainKeys) {
        const isMissingFromAll = otherFilesKeys.every(fileKeys => !fileKeys.includes(key))
        if (isMissingFromAll) {
            missingKeys.push(key)
        }
    }

    return missingKeys
}
