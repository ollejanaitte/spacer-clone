import { describe, test, expect } from "vitest";
import { classify } from "../services/resultClassifier";

describe("resultClassifier", () => {
  test("small (r=0.25)", () => expect(classify(5, 20)).toBe("small"));
  test("medium (r=0.5)", () => expect(classify(10, 20)).toBe("medium"));
  test("large (r=0.9)", () => expect(classify(18, 20)).toBe("large"));
  test("boundary r=0.3 -> medium", () => expect(classify(6, 20)).toBe("medium"));
  test("boundary r=0.7 -> large", () => expect(classify(14, 20)).toBe("large"));
  test("zero displacement -> small", () => expect(classify(0, 20)).toBe("small"));
  test("zero reference -> small", () => expect(classify(10, 0)).toBe("small"));
  test("negative reference -> small", () => expect(classify(10, -5)).toBe("small"));
});
