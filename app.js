// para cargar los datos(revisaar 1/3)
const usuario = usuarioActual();
const datos   = cargarDatos();

let ingresos     = datos.ingresos;
let gastos       = datos.gastos;
let cuotas       = datos.cuotas;
let presupuestos = datos.presupuestos; 

const CATEGORIAS_GASTO   = ["Vivienda", "Alimentación", "Transporte", "Servicios", "Salud", "Educación", "Ocio", "Deudas", "Ahorro", "Otros"];
const CATEGORIAS_INGRESO = ["Sueldo", "Sueldo extra", "Bono", "Arriendo", "Otro"];

const listaGastos   = document.getElementById("listaGastos");
const listaIngresos = document.getElementById("listaIngresos");
const listaCuotas   = document.getElementById("listaCuotas");
const listaPres     = document.getElementById("listaPres");
const totalIngresos = document.getElementById("totalIngresos");
const totalGastos   = document.getElementById("totalGastos");
const totalLibre    = document.getElementById("totalLibre");
const tarjetaLibre  = document.getElementById("tarjetaLibre");
const etiquetaLibre = document.getElementById("etiquetaLibre");
const aviso         = document.getElementById("aviso");
const mesSel        = document.getElementById("mesSel");

// ingresos y gastos (agregar y editarr)
const modalMovEl   = document.getElementById("modalMov");
const modalMov     = new bootstrap.Modal(modalMovEl);
const formMov      = document.getElementById("formMov");
const movNombre    = document.getElementById("movNombre");
const movMonto     = document.getElementById("movMonto");
const movFecha     = document.getElementById("movFecha");
const movCategoria = document.getElementById("movCategoria");
const movDescripcion = document.getElementById("movDescripcion");
let movTipo = "gasto";      
let movIndice = null;       
 
// parte de presupuestos
const modalPresEl  = document.getElementById("modalPres");
const modalPres    = new bootstrap.Modal(modalPresEl);
const formPres     = document.getElementById("formPres");
const presCategoria = document.getElementById("presCategoria");
const presMonto    = document.getElementById("presMonto");

// parte de cuotas
const modalCuotaEl = document.getElementById("modalCuota");
const modalCuota   = new bootstrap.Modal(modalCuotaEl);
const formCuota    = document.getElementById("formCuota");
const cuotaNombre  = document.getElementById("cuotaNombre");
const cuotaMonto   = document.getElementById("cuotaMonto");
const cuotaActual  = document.getElementById("cuotaActual");
const cuotaTotal   = document.getElementById("cuotaTotal");

function aNumero(texto) {
  return parseInt(String(texto).replace(/\D/g, ""), 10) || 0;
}

function aPesos(numero) {
  return "$ " + numero.toLocaleString("es-CL");
}

function formatearInput(input) {
  const n = aNumero(input.value);
  input.value = n ? n.toLocaleString("es-CL") : "";
}

function formatoFecha(iso) {
  const [a, m, d] = iso.split("-");
  return d + "-" + m + "-" + a;
}

function llenarSelect(select, opciones) {
  select.innerHTML = "";
  opciones.forEach(o => select.appendChild(new Option(o, o)));
}

function crearBoton(icono, etiqueta, alHacerClic) {
  const boton = document.createElement("button");
  boton.type = "button";
  boton.className = "btn-borrar";
  boton.setAttribute("aria-label", etiqueta);
  boton.innerHTML = '<i class="bi ' + icono + '"></i>';
  boton.addEventListener("click", alHacerClic);
  return boton;
}

// solo se cuentan los movimientos del mes seleccionado
function delMes(lista) {
  return lista
    .map((item, indice) => ({ item, indice }))
    .filter(x => x.item.fecha.startsWith(mesSel.value));
}

function mostrarMovimientos(contenedor, lista, tipo, textoVacio) {
  contenedor.innerHTML = "";
  const filas = delMes(lista);

  if (filas.length === 0) {
    const vacio = document.createElement("li");
    vacio.className = "vacio";
    vacio.textContent = textoVacio;
    contenedor.appendChild(vacio);
    return;
  }

  filas.forEach(({ item, indice }) => {
    const li = document.createElement("li");

    const info = document.createElement("div");
    info.className = "nombre";
    const nombre = document.createElement("div");
    nombre.textContent = item.nombre;
    const detalle = document.createElement("div");
    detalle.className = "mov-detalle";
    detalle.textContent = item.categoria + " · " + formatoFecha(item.fecha) +
      (item.descripcion ? " · " + item.descripcion : "");
    info.append(nombre, detalle);

    const monto = document.createElement("span");
    monto.textContent = aPesos(item.monto);

    li.append(info, monto,
      crearBoton("bi-pencil", "Editar " + item.nombre, () => abrirMov(tipo, indice)),
      crearBoton("bi-x-lg", "Eliminar " + item.nombre, () => eliminarMov(tipo, indice)));
    contenedor.appendChild(li);
  });
}

function mostrarCuotas() {
  listaCuotas.innerHTML = "";

  if (cuotas.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "vacio mb-0";
    vacio.textContent = "Aún no tienes compras en cuotas.";
    listaCuotas.appendChild(vacio);
    return;
  }

  cuotas.forEach((cuota, indice) => {
    const faltan = cuota.total - cuota.actual;

    const claseBadge = cuota.actual / cuota.total >= 0.75 ? "badge-verde" : "badge-naranja";

    let textoFaltan;
    if (faltan === 0)      textoFaltan = "Última cuota";
    else if (faltan === 1) textoFaltan = "Falta 1";
    else                   textoFaltan = "Faltan " + faltan;

    const fila = document.createElement("div");
    fila.className = "fila-cuota";

    const nombre = document.createElement("span");
    nombre.className = "fw-medium";
    nombre.textContent = cuota.nombre;

    const detalle = document.createElement("div");
    detalle.className = "d-flex align-items-center gap-2 flex-wrap justify-content-end";

    const monto = document.createElement("span");
    monto.className = "text-secondary small";
    monto.textContent = aPesos(cuota.monto) + " por mes";

    const badge = document.createElement("span");
    badge.className = "badge " + claseBadge;
    badge.textContent = "Cuota " + cuota.actual + " de " + cuota.total;

    const resto = document.createElement("span");
    resto.className = "small";
    resto.textContent = textoFaltan;

    detalle.append(monto, badge, resto, crearBoton("bi-x-lg", "Eliminar " + cuota.nombre, () => eliminarCuota(indice)));
    fila.append(nombre, detalle);
    listaCuotas.appendChild(fila);
  });
}

// presupuesto por categoría: lo usado y disponible del mes
function mostrarPresupuestos() {
  listaPres.innerHTML = "";
  const categorias = Object.keys(presupuestos);

  if (categorias.length === 0) {
    const vacio = document.createElement("p");
    vacio.className = "vacio mb-0";
    vacio.textContent = "Aún no defines presupuestos. Usa \"Definir presupuesto\" para empezar.";
    listaPres.appendChild(vacio);
    return;
  }

  const gastosMes = delMes(gastos).map(x => x.item);

  categorias.forEach(cat => {
    const tope  = presupuestos[cat];
    const usado = gastosMes.filter(g => g.categoria === cat).reduce((s, g) => s + g.monto, 0);
    const disponible = tope - usado;
    const pct = Math.min(100, Math.round(usado / tope * 100));
    const color = usado > tope ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-success";

    const fila = document.createElement("div");
    fila.className = "fila-pres";

    const cabecera = document.createElement("div");
    cabecera.className = "d-flex justify-content-between align-items-center mb-1 gap-2";
    const titulo = document.createElement("span");
    titulo.className = "fw-medium";
    titulo.textContent = cat;
    const acciones = document.createElement("div");
    acciones.className = "d-flex align-items-center";
    acciones.append(
      crearBoton("bi-pencil", "Editar presupuesto de " + cat, () => abrirPres(cat)),
      crearBoton("bi-x-lg", "Eliminar presupuesto de " + cat, () => { delete presupuestos[cat]; actualizarTodo(); }));
    cabecera.append(titulo, acciones);

    const barra = document.createElement("div");
    barra.className = "progress";
    barra.setAttribute("role", "progressbar");
    barra.setAttribute("aria-label", "Uso del presupuesto de " + cat);
    barra.setAttribute("aria-valuenow", pct);
    barra.setAttribute("aria-valuemin", 0);
    barra.setAttribute("aria-valuemax", 100);
    const relleno = document.createElement("div");
    relleno.className = "progress-bar " + color;
    relleno.style.width = pct + "%";
    barra.appendChild(relleno);

    const texto = document.createElement("div");
    texto.className = "d-flex justify-content-between small mt-1 flex-wrap";
    const izq = document.createElement("span");
    izq.className = "text-secondary";
    izq.textContent = "Usado " + aPesos(usado) + " de " + aPesos(tope);
    const der = document.createElement("span");
    der.className = usado > tope ? "text-danger" : "";
    der.textContent = usado > tope ? "Excedido por " + aPesos(-disponible) : "Disponible " + aPesos(disponible);
    texto.append(izq, der);

    fila.append(cabecera, barra, texto);
    listaPres.appendChild(fila);
  });
}

function calcularTotales() {
  const ingresosMes = delMes(ingresos).map(x => x.item);
  const gastosMes   = delMes(gastos).map(x => x.item);

  const totalIng    = ingresosMes.reduce((suma, i) => suma + i.monto, 0);
  const sumaGastos  = gastosMes.reduce((suma, g) => suma + g.monto, 0);
  const sumaCuotas  = cuotas.reduce((suma, c) => suma + c.monto, 0);
  const gastosTotal = sumaGastos + sumaCuotas;
  const libre       = totalIng - gastosTotal;

  totalIngresos.textContent = aPesos(totalIng);
  totalGastos.textContent   = aPesos(gastosTotal);

  const noAlcanza = libre < 0;
  totalLibre.textContent    = noAlcanza ? "- " + aPesos(Math.abs(libre)) : aPesos(libre);
  etiquetaLibre.textContent = noAlcanza ? "Te faltan" : "Te queda libre";
  tarjetaLibre.classList.toggle("total-libre", !noAlcanza);   // verde
  tarjetaLibre.classList.toggle("total-falta", noAlcanza);    // rojo

  mostrarAviso(totalIng, libre);
}

function mostrarAviso(ingresos, libre) {
  aviso.classList.remove("aviso-peligro", "aviso-alerta", "aviso-info");

  if (ingresos === 0) {
    aviso.classList.add("aviso-info");
    aviso.textContent = "Agrega tus ingresos para ver cuánto te queda este mes.";
  } else if (libre < 0) {
    aviso.classList.add("aviso-peligro");
    aviso.textContent = "Tu sueldo no te alcanza: tus gastos y cuotas superan tus ingresos por " +
      aPesos(Math.abs(libre)) + ". Revisa tus gastos o tus compras en cuotas.";
  } else if (libre < ingresos * 0.1) {
    aviso.classList.add("aviso-alerta");
    aviso.textContent = "Cuidado: solo te quedan " + aPesos(libre) +
      " (menos del 10% de tus ingresos). Un imprevisto podría dejarte sin fondos.";
  } else {
    aviso.textContent = "";
    aviso.classList.add("d-none");
    return;
  }
  aviso.classList.remove("d-none");
}

function guardar() {
  guardarDatos({ ingresos, gastos, cuotas, presupuestos });
}

function actualizarTodo() {
  mostrarMovimientos(listaIngresos, ingresos, "ingreso", "Aún no tienes ingresos este mes.");
  mostrarMovimientos(listaGastos, gastos, "gasto", "Aún no tienes gastos este mes.");
  mostrarCuotas();
  mostrarPresupuestos();
  calcularTotales();
  guardar();
}

function eliminarMov(tipo, indice) {
  (tipo === "ingreso" ? ingresos : gastos).splice(indice, 1);
  actualizarTodo();
}

function eliminarCuota(indice) {
  cuotas.splice(indice, 1);
  actualizarTodo();
}

// este es el formulario de Ingreso/Gasto (agregar y editar)
function abrirMov(tipo, indice = null) {
  movTipo = tipo;
  movIndice = indice;
  const esIngreso = tipo === "ingreso";
  const item = indice === null ? null : (esIngreso ? ingresos : gastos)[indice];

  document.getElementById("tituloModalMov").textContent =
    (item ? "Editar " : "Agregar ") + (esIngreso ? "ingreso" : "gasto");
  llenarSelect(movCategoria, esIngreso ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO);

  formMov.reset();
  [movNombre, movMonto, movFecha].forEach(c => c.classList.remove("is-invalid"));

  // fecha si estamos en el mes actual, si no el día 1 del mes que se esta viendo
  movFecha.value = item ? item.fecha : (mesSel.value === hoyISO().slice(0, 7) ? hoyISO() : mesSel.value + "-01");
  if (item) {
    movNombre.value = item.nombre;
    movMonto.value = item.monto.toLocaleString("es-CL");
    movCategoria.value = item.categoria;
    movDescripcion.value = item.descripcion;
  }
  modalMov.show();
}

formMov.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const nombre = movNombre.value.trim();
  const monto  = aNumero(movMonto.value);
  const fecha  = movFecha.value;

  movNombre.classList.toggle("is-invalid", nombre === "");
  movMonto.classList.toggle("is-invalid", monto <= 0);
  movFecha.classList.toggle("is-invalid", fecha === "");
  if (nombre === "" || monto <= 0 || fecha === "") return;

  const registro = { nombre, monto, fecha, categoria: movCategoria.value, descripcion: movDescripcion.value.trim() };
  const lista = movTipo === "ingreso" ? ingresos : gastos;
  if (movIndice === null) lista.push(registro);
  else lista[movIndice] = registro;

  // si el movimiento cae en otro mes, mostramos ese mes para que el usuario lo vea
  mesSel.value = fecha.slice(0, 7);
  actualizarTodo();
  modalMov.hide();
});

modalMovEl.addEventListener("shown.bs.modal", () => movNombre.focus());

// el formulario para el Presupuesto
function abrirPres(categoria = null) {
  llenarSelect(presCategoria, CATEGORIAS_GASTO);
  formPres.reset();
  presMonto.classList.remove("is-invalid");
  if (categoria) {
    presCategoria.value = categoria;
    presMonto.value = presupuestos[categoria].toLocaleString("es-CL");
  }
  modalPres.show();
}

formPres.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const monto = aNumero(presMonto.value);
  presMonto.classList.toggle("is-invalid", monto <= 0);
  if (monto <= 0) return;

  presupuestos[presCategoria.value] = monto;
  actualizarTodo();
  modalPres.hide();
});

presCategoria.addEventListener("change", () => {
  const actual = presupuestos[presCategoria.value];
  presMonto.value = actual ? actual.toLocaleString("es-CL") : "";
});
modalPresEl.addEventListener("shown.bs.modal", () => presMonto.focus());

// formulario de cuota
formCuota.addEventListener("submit", (evento) => {
  evento.preventDefault();

  const nombre = cuotaNombre.value.trim();
  const monto  = aNumero(cuotaMonto.value);
  const actual = aNumero(cuotaActual.value);
  const total  = aNumero(cuotaTotal.value);

  const totalOk  = total >= 1 && total <= 72;
  const actualOk = actual >= 1 && actual <= total;

  cuotaNombre.classList.toggle("is-invalid", nombre === "");
  cuotaMonto.classList.toggle("is-invalid", monto <= 0);
  cuotaTotal.classList.toggle("is-invalid", !totalOk);
  cuotaActual.classList.toggle("is-invalid", !actualOk);
  if (nombre === "" || monto <= 0 || !totalOk || !actualOk) return;

  cuotas.push({ nombre, monto, actual, total });
  actualizarTodo();
  modalCuota.hide();
});

// cuota
modalCuotaEl.addEventListener("show.bs.modal", () => {
  formCuota.reset();
  [cuotaNombre, cuotaMonto, cuotaActual, cuotaTotal].forEach(c => c.classList.remove("is-invalid"));
});
modalCuotaEl.addEventListener("shown.bs.modal", () => cuotaNombre.focus());

// Gasto y Cuota
cuotaMonto.addEventListener("input", () => formatearInput(cuotaMonto));

//botones para abrir los formularios
document.getElementById("btnAddIngreso").addEventListener("click", () => abrirMov("ingreso"));
document.getElementById("btnAddGasto").addEventListener("click", () => abrirMov("gasto"));
document.getElementById("btnAddPres").addEventListener("click", () => abrirPres());
movMonto.addEventListener("input", () => formatearInput(movMonto));
presMonto.addEventListener("input", () => formatearInput(presMonto));
mesSel.addEventListener("change", () => { if (mesSel.value) actualizarTodo(); else { mesSel.value = hoyISO().slice(0, 7); actualizarTodo(); } });

// inico dnv
mesSel.value = hoyISO().slice(0, 7);

actualizarTodo();
