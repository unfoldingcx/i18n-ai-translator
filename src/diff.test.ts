import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import fs from "fs"
import path from "path"
import { findMissingKeys } from "./diff"

describe("findMissingKeys", () => {
  const testDir = path.join(__dirname, "test-translations")
  const mainFile = path.join(testDir, "main.json")

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }

    // Create main translation file
    const mainData = {
      common: {
        greeting: "Hello",
        farewell: "Goodbye",
        name: "Name"
      },
      navigation: {
        home: "Home",
        about: "About"
      },
      onlyInMain: "This key only exists in main"
    }
    fs.writeFileSync(mainFile, JSON.stringify(mainData, null, 2))
  })

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir)
      for (const file of files) {
        fs.unlinkSync(path.join(testDir, file))
      }
      fs.rmdirSync(testDir)
    }
  })

  test("finds keys missing from other translation files", () => {
    // Create incomplete translation file
    const incompleteData = {
      common: {
        greeting: "Hola",
        farewell: "Adiós"
        // missing: name, onlyInMain
      },
      navigation: {
        home: "Inicio",
        about: "Acerca de"
      }
      // missing: onlyInMain
    }
    fs.writeFileSync(path.join(testDir, "es.json"), JSON.stringify(incompleteData, null, 2))

    const missingKeys = findMissingKeys(mainFile, testDir)

    expect(missingKeys).toContain("common.name")
    expect(missingKeys).toContain("onlyInMain")
    expect(missingKeys).not.toContain("common.greeting")
    expect(missingKeys).not.toContain("navigation.home")
  })

  test("returns empty array when all keys exist in other files", () => {
    // Create complete translation file
    const completeData = {
      common: {
        greeting: "Bonjour",
        farewell: "Au revoir",
        name: "Nom"
      },
      navigation: {
        home: "Accueil",
        about: "À propos"
      },
      onlyInMain: "Cette clé existe aussi"
    }
    fs.writeFileSync(path.join(testDir, "fr.json"), JSON.stringify(completeData, null, 2))

    const missingKeys = findMissingKeys(mainFile, testDir)

    expect(missingKeys).toEqual([])
  })

  test("handles multiple translation files", () => {
    // Create first incomplete file (missing some keys)
    const data1 = {
      common: {
        greeting: "Hallo",
        farewell: "Auf Wiedersehen",
        // missing: name
      },
      navigation: {
        home: "Startseite",
        // missing: about
      }
      // missing: onlyInMain
    }
    fs.writeFileSync(path.join(testDir, "de.json"), JSON.stringify(data1, null, 2))

    // Create second incomplete file (missing different keys)
    const data2 = {
      common: {
        greeting: "Ciao",
        // missing: farewell, name
      },
      navigation: {
        home: "Home",
        about: "Informazioni"
      }
      // missing: onlyInMain
    }
    fs.writeFileSync(path.join(testDir, "it.json"), JSON.stringify(data2, null, 2))

    const missingKeys = findMissingKeys(mainFile, testDir)

    // Should find keys missing from ALL other files
    expect(missingKeys).toContain("common.name")      // missing from both de.json and it.json
    expect(missingKeys).toContain("onlyInMain")       // missing from both files
    // common.farewell exists in de.json, so it's not missing from ALL files
    expect(missingKeys).not.toContain("common.farewell")
    // navigation.about exists in it.json, so it's not missing from ALL files
    expect(missingKeys).not.toContain("navigation.about")
  })

  test("ignores non-JSON files", () => {
    // Create a text file
    fs.writeFileSync(path.join(testDir, "readme.txt"), "This is not a JSON file")

    // Create a valid JSON file
    const validData = {
      common: {
        greeting: "Hello",
        farewell: "Goodbye"
      }
    }
    fs.writeFileSync(path.join(testDir, "valid.json"), JSON.stringify(validData, null, 2))

    const missingKeys = findMissingKeys(mainFile, testDir)

    // Should still find missing keys, ignoring the text file
    expect(missingKeys).toContain("common.name")
    expect(missingKeys).toContain("navigation.home")
    expect(missingKeys).toContain("navigation.about")
    expect(missingKeys).toContain("onlyInMain")
  })

  test("returns all keys when no other translation files exist", () => {
    const missingKeys = findMissingKeys(mainFile, testDir)

    // When no other JSON files exist, all keys from main are "missing" from other files
    expect(missingKeys).toContain("common.greeting")
    expect(missingKeys).toContain("common.farewell")
    expect(missingKeys).toContain("common.name")
    expect(missingKeys).toContain("navigation.home")
    expect(missingKeys).toContain("navigation.about")
    expect(missingKeys).toContain("onlyInMain")
  })

  test("throws error for non-existent main file", () => {
    const nonExistentFile = path.join(testDir, "non-existent.json")

    expect(() => {
      findMissingKeys(nonExistentFile, testDir)
    }).toThrow("Main file not found")
  })

  test("throws error for non-existent directory", () => {
    const nonExistentDir = path.join(__dirname, "non-existent-dir")

    expect(() => {
      findMissingKeys(mainFile, nonExistentDir)
    }).toThrow("Translations directory not found")
  })

  test("handles nested object structures", () => {
    const nestedData = {
      common: {
        greeting: "Hi",
        farewell: "Bye"
      },
      // Missing entire navigation section and onlyInMain
    }
    fs.writeFileSync(path.join(testDir, "nested.json"), JSON.stringify(nestedData, null, 2))

    const missingKeys = findMissingKeys(mainFile, testDir)

    expect(missingKeys).toContain("common.name")
    expect(missingKeys).toContain("navigation.home")
    expect(missingKeys).toContain("navigation.about")
    expect(missingKeys).toContain("onlyInMain")
  })

  test("handles empty translation files", () => {
    fs.writeFileSync(path.join(testDir, "empty.json"), JSON.stringify({}, null, 2))

    const missingKeys = findMissingKeys(mainFile, testDir)

    // All keys should be missing from the empty file
    expect(missingKeys).toContain("common.greeting")
    expect(missingKeys).toContain("common.farewell")
    expect(missingKeys).toContain("common.name")
    expect(missingKeys).toContain("navigation.home")
    expect(missingKeys).toContain("navigation.about")
    expect(missingKeys).toContain("onlyInMain")
  })
})