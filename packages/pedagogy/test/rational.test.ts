import { describe, expect, it } from "vitest";
import { equals, parseNumber, rational } from "../src";

const value = (s: string) => parseNumber(s)?.value;

describe("lecture des nombres écrits par un élève", () => {
  it.each([
    ["12", rational(12n, 1n)],
    ["-3,5", rational(-7n, 2n)],
    ["3.5", rational(7n, 2n)],
    [",5", rational(1n, 2n)],
    ["0,25", rational(1n, 4n)],
    ["1 000", rational(1000n, 1n)],
    ["1\u202f000,5", rational(2001n, 2n)],
    ["7/2", rational(7n, 2n)],
    ["−7 / 2", rational(-7n, 2n)],
    ["+4", rational(4n, 1n)],
    ["3.", rational(3n, 1n)],
  ])("« %s »", (input, expected) => {
    const v = value(input);
    expect(v).toBeDefined();
    expect(equals(v!, expected)).toBe(true);
  });

  it.each(["", "abc", "1 1/2", "3,5,2", "1/0", "12 34", ",", "--3", "1e5"])("refuse « %s »", (input) => {
    expect(parseNumber(input)).toBeNull();
  });

  it("repère la forme et la simplification", () => {
    expect(parseNumber("6/8")).toMatchObject({ form: "fraction", simplified: false });
    expect(parseNumber("3/4")).toMatchObject({ form: "fraction", simplified: true });
    expect(parseNumber("4/1")).toMatchObject({ form: "fraction", simplified: false });
    expect(parseNumber("0,75")).toMatchObject({ form: "decimal" });
    expect(parseNumber("75")).toMatchObject({ form: "integer" });
  });

  it("calcule exactement (pas d'erreur d'arrondi type 0,1 + 0,2)", () => {
    expect(equals(value("0,3")!, rational(3n, 10n))).toBe(true);
  });
});
