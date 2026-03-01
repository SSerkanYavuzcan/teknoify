/**
 * dashboard/shared/request-console.js
 * Simple API console -> DIRECT call to backend function (NO proxy wrapper, NO BigQuery)
 *
 * Backend expects:
 *   POST {apiEndpoint}{proxyPath}   (example: https://...cloudfunctions.net/apiProxy)
 *   JSON body: { orderId: "...", project_id: "bim_faz_2" }
 */

(function () {
  // -------------------- Helpers --------------------
  function $(id) { return document.getElementById(id); }
  function nowMs() { return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now(); }

  function safeJsonParse(text) {
    try { return { ok: true, value: JSON.parse(text) }; }
    catch (e) { return { ok: false, error: e }; }
  }

  function prettyJson(obj) {
    try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
  }

  function setText(el, text) { if (el) el.textContent = text; }

  function escHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function triggerToast(title, message, type) {
    if (typeof window.showCustomToast === "function") window.showCustomToast(title, message, type);
    else alert(`${title}: ${message}`);
  }

  async function getFirebaseIdToken() {
    try {
      const u = window.auth?.currentUser;
      if (u && typeof u.getIdToken === "function") return await u.getIdToken(true);
    } catch {}
    return "";
  }

  function getBackendUrl() {
    const cfg = window.PROJECT_CONFIG || {};
    const base = String(cfg.apiEndpoint || "").trim().replace(/\/$/, "");
    const path = String(cfg.proxyPath || "/apiProxy").trim();
    if (!base) return "";
    return base + (path.startsWith("/") ? path : "/" + path);
  }

  // -------------------- DOM refs --------------------
  const elMethod = $("rc-method");
  const elMethodWrap = $("request-action-row") || $("rc-method-wrap");
  const elUrl = $("rc-url");
  const elSend = $("rc-send");

  const elTabs = document.querySelectorAll(".rc-tab[data-tab]");
  const elPanels = { headers: $("rc-panel-headers"), body: $("rc-panel-body") };

  const elRTabs = document.querySelectorAll(".rc-tab[data-rtab]");
  const elRPanels = { resp: $("rc-rpanel-resp"), rheaders: $("rc-rpanel-rheaders"), preview: $("rc-rpanel-preview") };

  const elHeadersWrap = $("rc-headers");
  const elAddHeader = $("rc-add-header");
  const elClearHeaders = $("rc-clear-headers");
  const elBody = $("rc-body");

  const elStatus = $("rc-status");
  const elTime = $("rc-time");
  const elResp = $("rc-response");
  const elRespHeaders = $("rc-response-headers");

  const elFilterOrderId = $("filter-order-id");
  const elFlowStatus = $("tk-flow-status");

  const state = { headers: [], lastResponse: null };

  // -------------------- Headers editor --------------------
  function headerRowTemplate(i, key, value) {
    return `
      <div class="rc-kv" data-i="${i}">
        <input class="rc-input rc-h-key" placeholder="Header" value="${escHtml(key)}" />
        <input class="rc-input rc-h-val" placeholder="Value" value="${escHtml(value)}" />
        <button class="rc-kv-remove" title="Sil"><i class="fas fa-times"></i></button>
      </div>`;
  }

  function renderHeaders() {
    if (!elHeadersWrap) return;
    const rows = state.headers.map((h, i) => headerRowTemplate(i, h.key, h.value));
    elHeadersWrap.innerHTML = rows.join("") || `<div class="rc-meta">Header yok.</div>`;

    elHeadersWrap.querySelectorAll(".rc-kv").forEach((row) => {
      const i = Number(row.getAttribute("data-i"));
      const keyEl = row.querySelector(".rc-h-key");
      const valEl = row.querySelector(".rc-h-val");
      const delEl = row.querySelector(".rc-kv-remove");
      if (keyEl) keyEl.addEventListener("input", () => { state.headers[i].key = keyEl.value; });
      if (valEl) valEl.addEventListener("input", () => { state.headers[i].value = valEl.value; });
      if (delEl) delEl.addEventListener("click", () => { state.headers.splice(i, 1); renderHeaders(); });
    });
  }

  function addHeader(key = "", value = "") { state.headers.push({ key, value }); renderHeaders(); }
  function clearHeaders() { state.headers = []; renderHeaders(); }

  function collectHeadersObject() {
    const out = {};
    for (const h of state.headers) {
      const k = String(h.key || "").trim();
      const v = String(h.value || "").trim();
      if (k) out[k] = v;
    }
    return out;
  }

  // -------------------- Tabs --------------------
  function showTab(tabKey) {
    Object.keys(elPanels).forEach((k) => { if (elPanels[k]) elPanels[k].style.display = (k === tabKey) ? "" : "none"; });
    elTabs.forEach((t) => t.classList.toggle("active", t.getAttribute("data-tab") === tabKey));
  }

  function showRTab(tabKey) {
    Object.keys(elRPanels).forEach((k) => { if (elRPanels[k]) elRPanels[k].style.display = (k === tabKey) ? "" : "none"; });
    elRTabs.forEach((t) => t.classList.toggle("active", t.getAttribute("data-rtab") === tabKey));
  }

  function syncMethodChip() {
    if (!elMethodWrap || !elMethod) return;
    elMethodWrap.setAttribute("data-method", String(elMethod.value || "POST").toUpperCase());
  }

  // -------------------- Response rendering --------------------
  function renderResponse(resp) {
    state.lastResponse = resp || null;

    if (!resp) {
      setText(elStatus, "Status: -"); setText(elTime, "Time: -");
      setText(elResp, "Henüz istek gönderilmedi.");
      setText(elRespHeaders, "-");
      return;
    }

    setText(elStatus, `Status: ${resp.status ?? "-"}`);
    setText(elTime, `Time: ${typeof resp.ms === "number" ? resp.ms.toFixed(0) + " ms" : "-"}`);

    setText(elResp, typeof resp.body === "string" ? resp.body : prettyJson(resp.body));

    const h = resp.headers || {};
    setText(elRespHeaders, Object.keys(h).map(k => `${k}: ${h[k]}`).join("\n") || "-");
  }

  // -------------------- Core request (DIRECT) --------------------
  async function sendDirect({ method, url, headers, bodyJson } = {}) {
    const m = String(method || "POST").toUpperCase();
    const targetUrl = String(url || "").trim();
    if (!targetUrl) {
      renderResponse({ status: "ERR", body: "URL boş olamaz." });
      return;
    }

    const idToken = await getFirebaseIdToken();

    const outHeaders = Object.assign({}, headers || {});
    outHeaders["Content-Type"] = "application/json";
    if (idToken) outHeaders["Authorization"] = `Bearer ${idToken}`;

    const t0 = nowMs();
    try {
      setText(elStatus, "Status: ...");
      const res = await fetch(targetUrl, {
        method: m,
        headers: outHeaders,
        body: bodyJson !== undefined ? JSON.stringify(bodyJson) : undefined
      });

      const ms = nowMs() - t0;
      const resHeaders = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });

      const ct = (res.headers.get("content-type") || "").toLowerCase();
      const data = ct.includes("application/json") ? await res.json() : await res.text();

      renderResponse({ status: res.status, ms, headers: resHeaders, body: data });
      showRTab("resp");
    } catch (e) {
      renderResponse({ status: "ERR", ms: nowMs() - t0, body: e?.message || String(e) });
      showRTab("resp");
    }
  }

  // --- BIM flow (same endpoint, same payload) ---
  async function runBimFlow() {
    const cfg = window.PROJECT_CONFIG || {};
    const orderId = String(elFilterOrderId?.value || "").trim();
    if (!orderId) {
      triggerToast("Eksik Bilgi", "Lütfen bir Order ID giriniz.", "error");
      return;
    }

    if (elFlowStatus) elFlowStatus.textContent = "İşleniyor...";

    const backendUrl = getBackendUrl();
    const bodyJson = {
      orderId,
      project_id: cfg.projectId || "bim_faz_2"
    };

    await sendDirect({
      method: "POST",
      url: backendUrl,
      headers: {}, // extra headers if needed
      bodyJson
    });

    if (elFlowStatus) elFlowStatus.textContent = "Akış tamamlandı.";
  }

  // -------------------- Init / wiring --------------------
  function wireEvents() {
    elTabs.forEach(t => t.addEventListener("click", () => showTab(t.getAttribute("data-tab"))));
    elRTabs.forEach(t => t.addEventListener("click", () => showRTab(t.getAttribute("data-rtab"))));

    if (elAddHeader) elAddHeader.addEventListener("click", () => addHeader("", ""));
    if (elClearHeaders) elClearHeaders.addEventListener("click", () => clearHeaders());
    if (elMethod) elMethod.addEventListener("change", syncMethodChip);

    // "Send" button: direct call to URL in rc-url
    if (elSend) {
      elSend.addEventListener("click", async () => {
        const method = String(elMethod?.value || "POST").toUpperCase();

        // Parse JSON body if method supports body; otherwise send empty
        let bodyJson = undefined;
        if (!["GET", "HEAD"].includes(method)) {
          const raw = String(elBody?.value || "").trim();

          if (raw) {
            const p = safeJsonParse(raw);
            if (!p.ok) {
              triggerToast("JSON Format Hatası", "Body alanına geçerli JSON giriniz.", "error");
              return;
            }
            bodyJson = p.value;
          } else {
            // If body is empty, fallback to orderId input (nice UX)
            const oid = String(elFilterOrderId?.value || "").trim();
            if (oid) {
              const cfg = window.PROJECT_CONFIG || {};
              bodyJson = { orderId: oid, project_id: cfg.projectId || "bim_faz_2" };
            }
          }
        }

        await sendDirect({
          method,
          url: elUrl?.value || "",
          headers: collectHeadersObject(),
          bodyJson
        });
      });
    }

    // Flow button
    const elRunFlow = $("btn-run-flow");
    if (elRunFlow) elRunFlow.addEventListener("click", async () => { try { await runBimFlow(); } catch (e) { console.error(e); } });

    syncMethodChip();
  }

  function init() {
    if (!$("rc-send")) return;

    renderHeaders();
    renderResponse(null);

    showTab("headers");
    showRTab("resp");

    wireEvents();

    // Default URL should be BACKEND endpoint
    const backendUrl = getBackendUrl();
    if (elUrl && backendUrl) elUrl.value = backendUrl;

    // Default method
    if (elMethod) elMethod.value = "POST";
    syncMethodChip();

    // Default body template (optional)
    const cfg = window.PROJECT_CONFIG || {};
    if (elBody && cfg.projectId) {
      elBody.value = JSON.stringify({ orderId: String(elFilterOrderId?.value || "pnu2-y3h8"), project_id: cfg.projectId }, null, 2);
    }
  }

  window.TK_INIT_REQUEST_CONSOLE = init;
  window.TK_RUN_BIM_FLOW = runBimFlow;
  document.addEventListener("DOMContentLoaded", init);
})();
