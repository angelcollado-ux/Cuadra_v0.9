const datos  = cargarDatos();
const mesSel = document.getElementById("mesSel");

function actualizar() {
  const r = resumenMes(datos, mesSel.value);
  const lista = generarConsejos({ ingresos: r.ingresos, libre: r.libre, gastos: r.gastosLista, cuotas: datos.cuotas });
  renderConsejos(document.getElementById("listaConsejos"), lista);
  document.getElementById("sinConsejos").classList.toggle("d-none", lista.length > 0);
}

mesSel.value = mesActualISO();
mesSel.addEventListener("change", () => { if (!mesSel.value) mesSel.value = mesActualISO(); actualizar(); });
renderConsejos(document.getElementById("listaTips"), CONSEJOS_BASICOS);
actualizar();
