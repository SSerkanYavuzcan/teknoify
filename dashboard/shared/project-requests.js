import { db } from "/js/lib/firebase.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const STATUS = Object.freeze({ received: "Talep Alındı", reviewing: "İnceleniyor", planning: "Planlanıyor", approved: "Onaylandı", in_progress: "Geliştirme Aşamasında", testing: "Test Ediliyor", delivered: "Teslim Edildi", completed: "Tamamlandı", cancelled: "İptal Edildi", rejected: "Reddedildi" });
const formatter = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" });

function dateValue(value) { const date = value?.toDate ? value.toDate() : value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date : null; }
function text(tag, className, value) { const node = document.createElement(tag); node.className = className; node.textContent = value; return node; }
function renderState(root, kind, title, detail) { root.replaceChildren(); const box = text("div", `phase2-state phase2-state--compact phase2-state--${kind}`, ""); box.setAttribute("role", kind === "error" ? "alert" : "status"); box.append(text("strong", "", title)); if (detail) box.append(text("p", "", detail)); root.append(box); }
function card(record) {
  const data = record.data; const article = text("article", "request-card", ""); const head = text("div", "request-card__head", ""); const identity = text("div", "", "");
  identity.append(text("h3", "", data.title || data.projectName || "İsimsiz Proje Talebi"), text("span", "request-card__service", data.serviceName || "Hizmet bilgisi belirtilmedi"));
  head.append(identity, text("span", `request-status request-status--${data.status || "unknown"}`, STATUS[data.status] || "Durum Güncelleniyor"));
  article.append(head, text("p", "request-card__stage", data.currentStage || data.description || data.projectDescription || "Süreç bilgisi yakında güncellenecek.")); const meta = text("dl", "request-card__meta", "");
  [["Talep Tarihi", data.createdAt], ["Tahmini Teslim", data.estimatedDeliveryAt], ["Son Güncelleme", data.updatedAt]].forEach(([label, value]) => { const wrap = text("div", "", ""); const date = dateValue(value); wrap.append(text("dt", "", label), text("dd", "", date ? formatter.format(date) : "Belirtilmedi")); meta.append(wrap); }); article.append(meta); return article;
}
async function loadRequests() {
  const root = document.getElementById("project-request-results"); if (!root) return; const session = window.USER_SESSION; if (!session) return window.setTimeout(loadRequests, 50);
  if (session.impersonating) { root.setAttribute("aria-busy", "false"); renderState(root, "empty", "Kullanıcı görünümünde talepler gizli", "Proje talepleri yalnızca hesabın kendi oturumunda görüntülenebilir."); return; }
  try { const snapshot = await getDocs(query(collection(db, "project_requests"), where("userId", "==", session.uid))); const records = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() || {} })).sort((a, b) => (dateValue(b.data.updatedAt)?.getTime() || dateValue(b.data.createdAt)?.getTime() || 0) - (dateValue(a.data.updatedAt)?.getTime() || dateValue(a.data.createdAt)?.getTime() || 0)); root.replaceChildren(); if (!records.length) renderState(root, "empty", "Henüz proje talebiniz yok", "Ekibimize iletilmiş bir proje talebi bulunmuyor."); else { const list = text("div", "request-list", ""); records.forEach(record => list.append(card(record))); root.append(list); } }
  catch (error) { console.error("Proje talepleri yüklenemedi:", error); renderState(root, "error", "Talepler yüklenemedi", "Bağlantınızı kontrol edip daha sonra yeniden deneyin."); } finally { root.setAttribute("aria-busy", "false"); }
}
document.getElementById("project-request-create")?.addEventListener("click", event => { const note = document.getElementById("project-request-availability"); note.hidden = false; event.currentTarget.setAttribute("aria-expanded", "true"); });
loadRequests();
