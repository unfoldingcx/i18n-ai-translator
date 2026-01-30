import { describe, test, expect } from "bun:test";
import { flatten, unflatten } from "./parser";

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
