export const PAGE_SIZE = 10;

export const STATUSES = ["novo", "ativo", "concluido", "arquivado"];

const STATUS_LABELS = {
  novo: "Novo",
  ativo: "Ativo",
  concluido: "Concluído",
  arquivado: "Arquivado",
};

const STATUS_DOTS = {
  novo: "bg-slate-400",
  ativo: "bg-sky-500",
  concluido: "bg-emerald-500",
  arquivado: "bg-slate-300",
};

const STATUS_TEXT = {
  novo: "text-slate-600",
  ativo: "text-sky-700",
  concluido: "text-emerald-700",
  arquivado: "text-slate-400",
};

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function itemCopyText(item = {}) {
  return [item.title, item.body].filter(Boolean).join("\n\n");
}

function statusSelect(item, encoded) {
  const dot = STATUS_DOTS[item.status] ?? STATUS_DOTS.novo;
  const text = STATUS_TEXT[item.status] ?? STATUS_TEXT.novo;
  const options = STATUSES.map((status) => {
    const selected = status === item.status ? " selected" : "";
    return `<option value="${status}"${selected}>${STATUS_LABELS[status]}</option>`;
  }).join("");
  return `<div class="relative w-full">
    <span class="pointer-events-none absolute left-2.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ${dot}"></span>
    <select name="status" hx-post="/api/items/${encoded}" hx-target="closest tr" hx-swap="outerHTML" hx-include="closest tr" hx-trigger="change" class="w-full cursor-pointer appearance-none rounded-md border border-slate-200 bg-white py-1.5 pl-7 pr-7 text-xs font-medium shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 ${text}">${options}</select>
    <svg class="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m6 8 4 4 4-4" stroke-linecap="round" stroke-linejoin="round" /></svg>
  </div>`;
}

function updatedLabel(updatedAt) {
  if (!updatedAt) return "—";
  return new Date(updatedAt).toLocaleString("pt-BR", { timeZone: "UTC" });
}

const CELL = "px-3 py-2 align-top md:table-cell md:px-4 md:py-3";

function cell(label, content, { className = "" } = {}) {
  const classes = `${className ? `${className} ` : ""}${CELL}`;
  const labelAttr = label ? ` data-label="${label}"` : "";
  return `<td class="${classes}"${labelAttr}>${content}</td>`;
}

export function renderRow(item) {
  const encoded = encodeURIComponent(item.id);
  const hx = `hx-post="/api/items/${encoded}" hx-target="closest tr" hx-swap="outerHTML" hx-include="closest tr" hx-trigger="change"`;

  const title = `<span class="font-semibold text-slate-800">${escapeHtml(item.title)}</span>`;
  const body = `<p class="max-w-sm whitespace-pre-line text-sm leading-relaxed text-slate-700">${escapeHtml(item.body)}</p>`;
  const actions = `<div class="flex items-center gap-1.5 whitespace-nowrap">
      <button type="button" data-action="copy" data-message="${escapeHtml(itemCopyText(item))}" class="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-900">Copiar</button>
    </div>`;

  return `<tr class="item-row group border-b border-slate-100 align-top transition hover:bg-slate-50/80" data-id="${escapeHtml(item.id)}">
  ${cell("", title)}
  ${cell("Descrição", body, { className: "body" })}
  ${cell("Status", statusSelect(item, encoded))}
  ${cell("Responsável", `<input name="owner" ${hx} value="${escapeHtml(item.owner)}" placeholder="responsável" class="w-full rounded-md border border-slate-200 px-2 py-1 text-xs shadow-sm outline-none focus:border-slate-400" />`)}
  ${cell("Nota", `<input name="note" ${hx} value="${escapeHtml(item.note)}" placeholder="nota" class="w-full rounded-md border border-slate-200 px-2 py-1 text-xs shadow-sm outline-none focus:border-slate-400" />`)}
  ${cell("Atualizado em", `<span class="whitespace-nowrap text-xs text-slate-400">${escapeHtml(updatedLabel(item.updatedAt))}</span>`)}
  ${cell("", actions)}
</tr>`;
}

function pageButton(label, page, enabled) {
  if (!enabled) {
    return `<span class="cursor-not-allowed rounded-md border border-slate-200 px-3 py-1 text-slate-300">${label}</span>`;
  }
  return `<button type="button" class="rounded-md border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-900" hx-get="/api/items" hx-target="#items-panel" hx-swap="outerHTML" hx-include="#filters" hx-vals='{"page":${page}}'>${label}</button>`;
}

export function renderFragment({
  items = [],
  page = 1,
  pageSize = PAGE_SIZE,
  total = items.length,
} = {}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(current * pageSize, total);
  const label = `${total} ${total === 1 ? "item" : "itens"}`;
  const rows =
    items.length > 0
      ? items.map(renderRow).join("\n")
      : '<tr><td colspan="7" class="px-4 py-16 text-center text-slate-400">Nenhum item encontrado para esse filtro.</td></tr>';

  return `<span id="item-count" hx-swap-oob="true">${label}</span>
<div id="items-panel">
  <div class="items-scroll overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
    <table id="items-table" class="min-w-full divide-y divide-slate-200 text-left md:table-fixed">
      <thead class="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <tr>
          <th class="px-4 py-3 md:w-48">Título</th>
          <th class="px-4 py-3">Descrição</th>
          <th class="px-4 py-3 md:w-36">Status</th>
          <th class="px-4 py-3 md:w-32">Responsável</th>
          <th class="px-4 py-3 md:w-40">Nota</th>
          <th class="px-4 py-3 md:w-40">Atualizado em</th>
          <th class="px-4 py-3 md:w-28">Ações</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
${rows}
      </tbody>
    </table>
  </div>
  <nav class="flex flex-wrap items-center justify-between gap-3 px-1 py-3 text-sm text-slate-600">
    <span>Mostrando ${start}–${end} de ${total}</span>
    <div class="flex items-center gap-2">
      ${pageButton("Anterior", current - 1, current > 1)}
      <span class="px-2 font-medium">Página ${current} de ${totalPages}</span>
      ${pageButton("Próxima", current + 1, current < totalPages)}
    </div>
  </nav>
</div>`;
}

export function renderLogin({ error = false } = {}) {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Entrar · HTMX Turso Starter</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>
  <body class="flex min-h-screen items-center justify-center bg-slate-50 text-slate-800">
    <form action="/api/login" method="post" class="mx-4 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <p class="text-xs font-semibold uppercase tracking-widest text-slate-500">HTMX Turso Starter</p>
      <h1 class="mt-1 text-xl font-bold text-slate-900">Acesso restrito</h1>
      <p class="mt-1 text-sm text-slate-500">Digite a senha da equipe para continuar.</p>
      ${
        error
          ? '<p class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">Senha incorreta. Tente de novo.</p>'
          : ""
      }
      <input type="password" name="password" required autofocus placeholder="Senha" class="mt-6 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100" />
      <button type="submit" class="mt-4 w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700">Entrar</button>
    </form>
  </body>
</html>`;
}
