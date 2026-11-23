const datos     = cargarDatos();
const mesSel    = document.getElementById("mesSel");
const periodoSel = document.getElementById("periodoSel");
const tablaInforme = document.getElementById("tablaInforme");

function celda(texto, clase) {
  const td = document.createElement("td");
  td.textContent = texto;
  if (clase) td.className = clase;
  return td;
}

function textoBalance(n) {
  return (n < 0 ? "- " : "") + formatoPesos(Math.abs(n));
}

function actualizarEvolucion() {
  const meses = listaMeses(mesSel.value, Number(periodoSel.value));
  const filas = meses.map(m => resumenMes(datos, m));

  dibujarEvolucion(meses.map(etiquetaMes), filas.map(f => f.ingresos), filas.map(f => f.gastosTotal));

  tablaInforme.innerHTML = "";
  let totIng = 0, totGas = 0;
  filas.forEach((f, i) => {
    totIng += f.ingresos; totGas += f.gastosTotal;
    const tr = document.createElement("tr");
    tr.append(celda(etiquetaMes(meses[i])), celda(formatoPesos(f.ingresos), "text-end"),
              celda(formatoPesos(f.gastosTotal), "text-end"),
              celda(textoBalance(f.libre), "text-end " + (f.libre < 0 ? "text-danger" : "")));
    tablaInforme.appendChild(tr);
  });
  const total = document.createElement("tr");
  total.className = "fw-semibold";
  total.append(celda("Total del período"), celda(formatoPesos(totIng), "text-end"),
               celda(formatoPesos(totGas), "text-end"),
               celda(textoBalance(totIng - totGas), "text-end " + (totIng - totGas < 0 ? "text-danger" : "")));
  tablaInforme.appendChild(total);
}

function actualizar() {
  const r = resumenMes(datos, mesSel.value);
  actualizarGraficos({ ingresos: r.ingresos, libre: r.libre, gastos: r.gastosLista, cuotas: datos.cuotas, ingresosLista: r.ingresosLista });
  actualizarEvolucion();
}

mesSel.value = mesActualISO();
mesSel.addEventListener("change", () => { if (!mesSel.value) mesSel.value = mesActualISO(); actualizar(); });
periodoSel.addEventListener("change", actualizarEvolucion);
actualizar();
