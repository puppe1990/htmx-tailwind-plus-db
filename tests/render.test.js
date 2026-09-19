// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  itemCopyText,
  renderFragment,
  renderLogin,
  renderRow,
} from "../src/render.mjs";

const ITEM = {
  id: "a<script>",
  title: 'Título "x" & <b>y</b>',
  body: "Linha 1 & <i>2</i>",
  status: "concluido",
  owner: "Ana",
  note: "feito",
  updatedAt: "2026-09-18T12:00:00.000Z",
};

describe("escapeHtml", () => {
  it("escapes dangerous characters", () => {
    expect(escapeHtml('<a href="x">&\'</a>')).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;",
    );
  });
});

describe("itemCopyText", () => {
  it("joins title and body", () => {
    expect(itemCopyText({ title: "T", body: "B" })).toBe("T\n\nB");
  });
});

describe("renderRow", () => {
  it("escapes title and body", () => {
    const html = renderRow(ITEM);
    expect(html).not.toContain("<script>");
    expect(html).toContain("a&lt;script&gt;");
    expect(html).toContain("&lt;i&gt;2&lt;/i&gt;");
  });

  it("renders a custom status select that fires on change only", () => {
    const html = renderRow(ITEM);
    expect(html).toContain("appearance-none");
    const select = html.match(/<select\b[^>]*name="status"[^>]*>/)?.[0] ?? "";
    expect(html).toContain('value="concluido" selected');
    expect(select).toContain('hx-trigger="change"');
    expect(select).toContain("hx-post=");
    expect(html).toContain('data-label="Status"');
  });
});

describe("renderFragment", () => {
  it("renders rows, count and pagination", () => {
    const html = renderFragment({ items: [ITEM], page: 1, total: 155 });
    expect(html).toContain('id="item-count" hx-swap-oob="true"');
    expect(html).toContain("155 itens");
    expect(html).toContain('<table id="items-table"');
    expect(html).toContain("1–10 de 155");
    expect(html).toContain("Página 1 de 16");
    expect(html).toContain(`hx-vals='{"page":2}'`);
  });

  it("renders an empty state", () => {
    const html = renderFragment({ items: [], total: 0 });
    expect(html).toContain("Nenhum item encontrado");
    expect(html).toContain("0 itens");
  });
});

describe("renderLogin", () => {
  it("renders the password form and error", () => {
    expect(renderLogin()).toContain('action="/api/login"');
    expect(renderLogin({ error: true })).toContain("Senha incorreta");
  });
});
