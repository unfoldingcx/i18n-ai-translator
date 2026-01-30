import { describe, test, expect } from "bun:test";
import { flatten } from "./parser";

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
