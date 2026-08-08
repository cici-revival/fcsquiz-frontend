import "@testing-library/jest-dom/vitest";
import { JSDOM } from "jsdom";

const dom = new JSDOM("", { url: "http://localhost/" });
const g = globalThis as unknown as { localStorage: Storage; sessionStorage: Storage };

g.localStorage = dom.window.localStorage;
g.sessionStorage = dom.window.sessionStorage;
