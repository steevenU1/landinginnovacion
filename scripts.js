/* =========================================================
   Simuladores de financiamiento (rápido y detallado)
   - Soporta inputs con $ y comas (formato MXN)
   - Unifica funciones (sin duplicados)
   - Exporta tabla de amortización a CSV
   - No falla si algún bloque no existe en la página
   ========================================================= */

/* ---------- Utilidades ---------- */

// Formateo MXN
const fmtMXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 2,
});

// Convierte un valor tipo "$12,345.67" → 12345.67
function parseNum(raw) {
  if (raw == null) return 0;
  const s = String(raw).trim()
    .replace(/\s+/g, "")
    .replace(/\$/g, "")
    .replace(/,/g, ""); // MX usa coma como separador de miles
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

// Pago mensual (sistema francés). tasaMensualPct en %
function pagoMensual(monto, tasaMensualPct, meses) {
  const i = (parseFloat(tasaMensualPct) || 0) / 100;
  if (!meses || meses <= 0) return 0;
  if (!i) return monto / meses;
  const a = i * Math.pow(1 + i, meses);
  const b = Math.pow(1 + i, meses) - 1;
  return monto * (a / b);
}

/* ---------- Simulador RÁPIDO (ids: precio, enganche, plazo, tasa, resultado) ---------- */

function calcularRapido() {
  const elPrecio   = document.getElementById("precio");
  const elEng      = document.getElementById("enganche");
  const elPlazo    = document.getElementById("plazo");
  const elTasa     = document.getElementById("tasa");
  const elResultado= document.getElementById("resultado");

  // Si no existe el bloque, salimos en silencio
  if (!elPrecio || !elEng || !elPlazo || !elTasa || !elResultado) return;

  const precio = parseNum(elPrecio.value);
  const eng    = parseNum(elEng.value);
  const plazo  = parseInt(elPlazo.value, 10) || 0;
  const tasa   = parseFloat(elTasa.value);

  const monto  = Math.max(precio - eng, 0);
  if (!monto || !plazo || !Number.isFinite(tasa)) {
    elResultado.textContent = "Completa los datos para calcular.";
    return;
  }

  const pm    = pagoMensual(monto, tasa, plazo);
  const total = pm * plazo + eng;

  elResultado.innerHTML =
    `Mensualidad estimada: <b>${fmtMXN.format(pm)}</b> · Total aprox: ${fmtMXN.format(total)}`;
}

/* ---------- Simulador DETALLADO (ids: precio2, enganche2, plazo2, tasa2, resultado2, resumenMonto, tablaPagos, btnSimular, btnExport) ---------- */

function calcularDetallado() {
  const elPrecio   = document.getElementById("precio2");
  const elEng      = document.getElementById("enganche2");
  const elPlazo    = document.getElementById("plazo2");
  const elTasa     = document.getElementById("tasa2");
  const out        = document.getElementById("resultado2");
  const sum        = document.getElementById("resumenMonto");
  const tbody      = document.querySelector("#tablaPagos tbody");

  // Si falta el bloque detallado, no hacemos nada
  if (!elPrecio || !elEng || !elPlazo || !elTasa || !out || !sum || !tbody) return;

  const precio = parseNum(elPrecio.value);
  const eng    = parseNum(elEng.value);
  const plazo  = parseInt(elPlazo.value, 10) || 0;
  const tasa   = parseFloat(elTasa.value);

  const monto  = Math.max(precio - eng, 0);
  if (!monto || !plazo || !Number.isFinite(tasa)) {
    out.textContent = "Completa los datos para calcular.";
    tbody.innerHTML = `<tr><td colspan="5" class="subtle">Calcula para ver tu plan.</td></tr>`;
    sum.textContent = "—";
    window.__simCSV = []; // limpia CSV en memoria
    return;
  }

  const pm = pagoMensual(monto, tasa, plazo);
  out.innerHTML = `Mensualidad estimada: <b>${fmtMXN.format(pm)}</b> · Monto: ${fmtMXN.format(monto)}`;
  sum.textContent = `Monto ${fmtMXN.format(monto)} · Tasa ${tasa}% · Plazo ${plazo}m`;

  // Render de tabla de amortización
  let saldo = monto;
  const i   = (tasa || 0) / 100;
  const rows = [];
  tbody.innerHTML = "";

  for (let k = 1; k <= plazo; k++) {
    const interes = saldo * i;
    const capital = Math.max(pm - interes, 0);
    saldo = Math.max(saldo - capital, 0);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="text-align:left">${k}</td>
      <td>${fmtMXN.format(pm)}</td>
      <td>${fmtMXN.format(interes)}</td>
      <td>${fmtMXN.format(capital)}</td>
      <td>${fmtMXN.format(saldo)}</td>
    `;
    tbody.appendChild(tr);

    rows.push([k, pm.toFixed(2), interes.toFixed(2), capital.toFixed(2), saldo.toFixed(2)]);
  }

  // CSV en memoria
  window.__simCSV = [["#", "Pago", "Interés", "Capital", "Saldo"], ...rows];
}

function exportCSV() {
  const data = window.__simCSV || [];
  if (!data.length) return;

  const csv = data.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "tabla_amortizacion.csv";
  a.click();

  URL.revokeObjectURL(url);
}

/* ---------- Validación mínima de formulario de contacto (opcional) ---------- */

function wireContactoValidation() {
  const cont = document.getElementById("contacto");
  if (!cont) return;
  const form = cont.querySelector("form");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    const nombre = form.querySelector("#c-nombre");
    const tel    = form.querySelector("#c-telefono");
    let ok = true;

    [nombre, tel].forEach(el => {
      if (!el || !String(el.value).trim()) {
        if (el) el.style.borderColor = "#e53935";
        ok = false;
      } else {
        el.style.borderColor = "#ddd";
      }
    });

    if (!ok) {
      e.preventDefault();
      alert("Completa al menos nombre y teléfono/WhatsApp.");
    }
  });
}

/* ---------- Arranque ---------- */

document.addEventListener("DOMContentLoaded", () => {
  // Año en el footer (soporta #y y #year-copy)
  const y1 = document.getElementById("y");
  if (y1) y1.textContent = new Date().getFullYear();
  const y2 = document.getElementById("year-copy");
  if (y2) y2.textContent = new Date().getFullYear();

  // Simulador rápido: recalcula en input y en cambio
  ["precio", "enganche", "plazo", "tasa"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", calcularRapido);
  });
  // Cálculo inicial si hay valores precargados
  calcularRapido();

  // Simulador detallado: listeners
  ["precio2", "enganche2", "plazo2", "tasa2"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", calcularDetallado);
  });

  const btnSim = document.getElementById("btnSimular");
  if (btnSim) btnSim.addEventListener("click", (e) => {
    e.preventDefault();
    calcularDetallado();
  });

  const btnExp = document.getElementById("btnExport");
  if (btnExp) btnExp.addEventListener("click", exportCSV);

  // Validación de contacto (si existe el bloque)
  wireContactoValidation();
});
