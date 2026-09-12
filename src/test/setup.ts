import "@testing-library/jest-dom/vitest";
import { JSDOM } from "jsdom";

const dom = new JSDOM("", { url: "http://localhost/" });
const g = globalThis as unknown as {
  localStorage: Storage;
  sessionStorage: Storage;
  ResizeObserver: unknown;
  EventSource: unknown;
};

g.localStorage = dom.window.localStorage;
g.sessionStorage = dom.window.sessionStorage;

// jsdom не реализует ResizeObserver, а на нём держится useFieldScale — без
// заглушки падал бы любой тест, который рендерит поле рассадки. Размер здесь
// всегда нулевой, поэтому масштаб поля в тестах равен 1.
if (!g.ResizeObserver) {
  g.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// EventSource в jsdom тоже нет. Заглушка ничего не соединяет: тестам стримов
// она всё равно подменяется своей через vi.stubGlobal, а компонентным нужна
// только чтобы подписка на монтировании не роняла рендер.
if (!g.EventSource) {
  g.EventSource = class {
    close() {}
  };
}
