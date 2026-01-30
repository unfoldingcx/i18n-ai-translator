import { describe, test, expect } from "bun:test";
import { flatten, unflatten, groupBySection, ungroupFromSections } from "./parser";

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

describe("groupBySection", () => {
  test("groups flattened keys by top-level section", () => {
    const input = {
      "auth.login.title": "Entrar",
      "auth.logout.button": "Sair",
      "nav.home": "Home",
      "nav.settings": "Config",
    };

    const result = groupBySection(input);

    expect(result).toEqual({
      auth: {
        "login.title": "Entrar",
        "logout.button": "Sair",
      },
      nav: {
        home: "Home",
        settings: "Config",
      },
    });
  });

  test("handles single-level keys as their own section", () => {
    const input = {
      title: "Hello",
      "auth.login": "Login",
    };

    const result = groupBySection(input);

    expect(result).toEqual({
      title: { "": "Hello" },
      auth: { login: "Login" },
    });
  });
});

describe("ungroupFromSections", () => {
  test("ungroups sections back to flat structure", () => {
    const input = {
      auth: {
        "login.title": "Entrar",
        "logout.button": "Sair",
      },
      nav: {
        home: "Home",
      },
    };

    const result = ungroupFromSections(input);

    expect(result).toEqual({
      "auth.login.title": "Entrar",
      "auth.logout.button": "Sair",
      "nav.home": "Home",
    });
  });

  test("handles empty remainder keys", () => {
    const input = {
      title: { "": "Hello" },
    };

    const result = ungroupFromSections(input);

    expect(result).toEqual({
      title: "Hello",
    });
  });

  test("roundtrip: groupBySection then ungroupFromSections returns original", () => {
    const original = {
      "auth.login.title": "Entrar",
      "nav.home": "Home",
    };

    const result = ungroupFromSections(groupBySection(original));
    expect(result).toEqual(original);
  });
});
