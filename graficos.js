// graficos circulares (Chart.js) reaccionan a los combios.
// Usa formatoPesos() y esGastoHormiga() de consejos.js.

const PALETA_GRAFICO = [
  "#6aa8ff", "#ff9a3c", "#4cd37b", "#c792ea", "#ffd166",
  "#4dd0e1", "#ff6b9d", "#a3be8c", "#f78c6c", "#82aaff",
];
const COLOR_AZUL    = "#6aa8ff";
const COLOR_NARANJA = "#ff9a3c";
const COLOR_VERDE   = "#4cd37b";
const COLOR_ROJO    = "#ff6b6b";
const COLOR_GRIS    = "#6b7280";

const graficos = {};   // id del canvas -> instancia de Chart

function coloresDePaleta(cantidad) {
  return Array.from({ length: cantidad }, (_, i) => PALETA_GRAFICO[i % PALETA_GRAFICO.length]);
}

// act el rafico de torta. Si no hay datos, muestra el mensaje de vacio
function dibujarTorta(idCanvas, etiquetas, valores, colores) {
  const lienzo = document.getElementById(idCanvas);
  if (!lienzo) return;

  const caja  = lienzo.closest(".grafico");
  const area  = lienzo.parentElement;
  const vacio = caja.querySelector(".grafico-vacio");

  // Solo se grafican mayores a 0
  const e = [], v = [], c = [];
  valores.forEach((valor, i) => {
    if (valor > 0) { e.push(etiquetas[i]); v.push(valor); c.push(colores[i]); }
  });
  const total = v.reduce((suma, n) => suma + n, 0);
  const hayDatos = total > 0;

  area.classList.toggle("d-none", !hayDatos);
  vacio.classList.toggle("d-none", hayDatos);

  if (!hayDatos) {
    if (graficos[idCanvas]) { graficos[idCanvas].destroy(); delete graficos[idCanvas]; }
    return;
  }

  lienzo.setAttribute("aria-label", caja.querySelector(".panel-title").textContent + ": " +
    e.map((et, i) => et + " " + Math.round(v[i] / total * 100) + "%").join(", "));

  if (graficos[idCanvas]) {
    const g = graficos[idCanvas];
    g.data.labels = e;
    g.data.datasets[0].data = v;
    g.data.datasets[0].backgroundColor = c;
    g.update();
    return;
  }

  graficos[idCanvas] = new Chart(lienzo, {
    type: "pie",
    data: {
      labels: e,
      datasets: [{ data: v, backgroundColor: c, borderColor: "#1f1f1f", borderWidth: 2 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#e8e8e8", boxWidth: 12, padding: 12, font: { size: 12 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const suma = ctx.dataset.data.reduce((s, n) => s + n, 0);
              const pct  = (ctx.parsed / suma * 100).toFixed(1).replace(".", ",");
              return " " + ctx.label + ": " + formatoPesos(ctx.parsed) + " (" + pct + "%)";
            },
          },
        },
      },
    },
  });
}

// datos: { sueldoFijo, sueldoExtra, ingresos, libre, gastos: [{nombre, monto}], cuotas: [{nombre, monto, actual, total}] }
function actualizarGraficos(datos) {
  const seccion = document.getElementById("graficos");
  if (!seccion) return;

  // Si Chart.js no carga, procede a a avisar 
  if (typeof Chart === "undefined") {
    document.getElementById("graficosError").classList.remove("d-none");
    return;
  }

  const { ingresosLista, libre, gastos, cuotas } = datos;
  const sumaGastos = gastos.reduce((s, g) => s + g.monto, 0);
  const sumaCuotas = cuotas.reduce((s, c) => s + c.monto, 0);

  // 1. A donde va tu sueldo?
  const alcanza = libre >= 0;
  dibujarTorta(
    "grafDestino",
    ["Gastos fijos", "Cuotas", "Te queda libre"],
    [sumaGastos, sumaCuotas, alcanza ? libre : 0],
    [COLOR_AZUL, COLOR_NARANJA, COLOR_VERDE]
  );
  const notaDestino = document.getElementById("notaDestino");
  if (datos.ingresos > 0 && !alcanza) {
    notaDestino.textContent = "Tus gastos superan tus ingresos por " + formatoPesos(Math.abs(libre)) + ": no queda saldo libre.";
    notaDestino.classList.remove("d-none");
  } else {
    notaDestino.classList.add("d-none");
  }

  // 2. Origen de los ingresos (por categoria)
  const porCat = (lista) => {
    const m = {};
    lista.forEach(x => { m[x.categoria] = (m[x.categoria] || 0) + x.monto; });
    return m;
  };
  const ing = porCat(ingresosLista);
  dibujarTorta("grafIngresos", Object.keys(ing), Object.values(ing), coloresDePaleta(Object.keys(ing).length));

  // 3. Gastos por categoria
  const gas = porCat(gastos);
  dibujarTorta("grafGastos", Object.keys(gas), Object.values(gas), coloresDePaleta(Object.keys(gas).length));

  // 4. cuotas del mes por compra
  dibujarTorta(
    "grafCuotas",
    cuotas.map(c => c.nombre),
    cuotas.map(c => c.monto),
    coloresDePaleta(cuotas.length)
  );

  // 5. gastos hormiga vs resto
  const hormiga = gastos.filter(g => esGastoHormiga(g.nombre)).reduce((s, g) => s + g.monto, 0);
  const resto   = sumaGastos - hormiga + sumaCuotas;
  dibujarTorta(
    "grafHormiga",
    ["Gastos hormiga", "Resto de gastos"],
    hormiga > 0 ? [hormiga, resto] : [0, 0],
    [COLOR_NARANJA, COLOR_GRIS]
  );

  // 6. avance de la deuda en cuotas (valor de cuota x cantidad de cuotas)
  const pagado    = cuotas.reduce((s, c) => s + c.monto * (c.actual - 1), 0);
  const esteMes   = sumaCuotas;
  const porPagar  = cuotas.reduce((s, c) => s + c.monto * (c.total - c.actual), 0);
  dibujarTorta(
    "grafDeuda",
    ["Ya pagado", "Este mes", "Por pagar"],
    [pagado, esteMes, porPagar],
    [COLOR_VERDE, COLOR_NARANJA, COLOR_AZUL]
  );
}

// evo mensual: ingresos y gastos por mes (barras) + balance (linea)
function listaMeses(mesFin, cantidad) {
  const [anio, mes] = mesFin.split("-").map(Number);
  const meses = [];
  for (let i = cantidad - 1; i >= 0; i--) {
    const d = new Date(anio, mes - 1 - i, 1);
    meses.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"));
  }
  return meses;
}

function etiquetaMes(iso) {
  const [a, m] = iso.split("-").map(Number);
  const t = new Date(a, m - 1, 1).toLocaleDateString("es-CL", { month: "short", year: "2-digit" }).replace(".", "");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function dibujarEvolucion(etiquetas, ingresos, gastos) {
  const lienzo = document.getElementById("grafEvolucion");
  if (!lienzo || typeof Chart === "undefined") return;

  const balance = ingresos.map((n, i) => n - gastos[i]);
  const datasets = [
    { type: "bar",  label: "Ingresos", data: ingresos, backgroundColor: COLOR_VERDE },
    { type: "bar",  label: "Gastos",   data: gastos,   backgroundColor: COLOR_NARANJA },
    { type: "line", label: "Balance",  data: balance,  borderColor: COLOR_AZUL, backgroundColor: COLOR_AZUL, tension: 0.25, pointRadius: 4 },
  ];

  lienzo.setAttribute("aria-label", "Evolución mensual de ingresos, gastos y balance: " +
    etiquetas.map((e, i) => e + " ingresos " + formatoPesos(ingresos[i]) + ", gastos " + formatoPesos(gastos[i])).join("; "));

  if (graficos.grafEvolucion) {
    const ch = graficos.grafEvolucion;
    ch.data.labels = etiquetas;
    ch.data.datasets = datasets;
    ch.update();
    return;
  }

  graficos.grafEvolucion = new Chart(lienzo, {
    data: { labels: etiquetas, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { color: "#e8e8e8", boxWidth: 12, padding: 12 } },
        tooltip: { callbacks: { label: (ctx) => " " + ctx.dataset.label + ": " + formatoPesos(ctx.parsed.y) } },
      },
      scales: {
        x: { ticks: { color: "#9a9a9a" }, grid: { color: "#333333" } },
        y: { ticks: { color: "#9a9a9a", callback: (v) => formatoPesos(v) }, grid: { color: "#333333" } },
      },
    },
  });
}
