// respaldos en JSON: exportar, validar el archivo y restaurar (usa auth.js y bootstrap)
// El respaldo guarda solo los datos financieros del usuario, nunca la contraseña.

const RESPALDO_APP      = "Cuadra";
const RESPALDO_VERSION  = 1;
const RESPALDO_MAX_BYTES = 2 * 1024 * 1024;   // 2 MB
const RESPALDO_MAX_FILAS = 10000;
const RESPALDO_AVISO_CLAVE = "cts_respaldo_aviso";

const RESP_CATEGORIAS_GASTO   = ["Vivienda", "Alimentación", "Transporte", "Servicios", "Salud", "Educación", "Ocio", "Deudas", "Ahorro", "Otros"];
const RESP_CATEGORIAS_INGRESO = ["Sueldo", "Sueldo extra", "Bono", "Arriendo", "Otro"];

// ---------- exportar ----------

function crearRespaldo() {
  const d = cargarDatos();
  return {
    app: RESPALDO_APP,
    version: RESPALDO_VERSION,
    exportado: new Date().toISOString(),
    datos: { ingresos: d.ingresos, gastos: d.gastos, cuotas: d.cuotas, presupuestos: d.presupuestos },
  };
}

function descargarRespaldo() {
  const respaldo = crearRespaldo();
  const texto = JSON.stringify(respaldo, null, 2);
  const blob  = new Blob([texto], { type: "application/json" });
  const url   = URL.createObjectURL(blob);

  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = "cuadra-respaldo-" + usuarioActual() + "-" + hoyISO() + ".json";
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return respaldo;
}

// ---------- validar ----------

function esObjetoPlano(x) {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

function esNumeroPositivo(x) {
  return typeof x === "number" && Number.isFinite(x) && x > 0 && x <= 1e12;
}

function esFechaISO(texto) {
  if (typeof texto !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [a, m, d] = texto.split("-").map(Number);
  const f = new Date(a, m - 1, d);
  return a >= 1900 && a <= 2200 && f.getFullYear() === a && f.getMonth() === m - 1 && f.getDate() === d;
}

function textoValido(x, max) {
  return typeof x === "string" && x.trim().length >= 1 && x.trim().length <= max;
}

// Revisa una lista de ingresos o gastos. Devuelve los registros limpios y agrega errores a "errores"
function validarMovimientos(lista, etiqueta, categorias, errores) {
  const limpios = [];
  if (!Array.isArray(lista)) {
    errores.push(etiqueta + ": debe ser una lista.");
    return limpios;
  }
  if (lista.length > RESPALDO_MAX_FILAS) {
    errores.push(etiqueta + ": tiene demasiados registros (máximo " + RESPALDO_MAX_FILAS + ").");
    return limpios;
  }
  lista.forEach((m, i) => {
    const donde = etiqueta + ", registro " + (i + 1) + ": ";
    if (!esObjetoPlano(m))                     { errores.push(donde + "no es un registro válido."); return; }
    if (!textoValido(m.nombre, 30))            { errores.push(donde + "el nombre falta o supera 30 caracteres."); return; }
    if (!esNumeroPositivo(m.monto))            { errores.push(donde + "el monto debe ser un número mayor a 0."); return; }
    if (!esFechaISO(m.fecha))                  { errores.push(donde + "la fecha no es válida (formato AAAA-MM-DD)."); return; }
    if (!categorias.includes(m.categoria))     { errores.push(donde + "la categoría \"" + String(m.categoria).slice(0, 30) + "\" no existe."); return; }
    const desc = m.descripcion === undefined ? "" : m.descripcion;
    if (typeof desc !== "string" || desc.length > 80) { errores.push(donde + "la descripción no es válida (máximo 80 caracteres)."); return; }
    limpios.push({ nombre: m.nombre.trim(), monto: m.monto, categoria: m.categoria, fecha: m.fecha, descripcion: desc.trim() });
  });
  return limpios;
}

function validarCuotas(lista, errores) {
  const limpias = [];
  if (!Array.isArray(lista)) {
    errores.push("Cuotas: debe ser una lista.");
    return limpias;
  }
  if (lista.length > RESPALDO_MAX_FILAS) {
    errores.push("Cuotas: tiene demasiados registros (máximo " + RESPALDO_MAX_FILAS + ").");
    return limpias;
  }
  lista.forEach((c, i) => {
    const donde = "Cuotas, registro " + (i + 1) + ": ";
    if (!esObjetoPlano(c))                    { errores.push(donde + "no es un registro válido."); return; }
    if (!textoValido(c.nombre, 30))           { errores.push(donde + "el nombre falta o supera 30 caracteres."); return; }
    if (!esNumeroPositivo(c.monto))           { errores.push(donde + "el monto debe ser un número mayor a 0."); return; }
    if (!Number.isInteger(c.total) || c.total < 1 || c.total > 72) { errores.push(donde + "el total de cuotas debe ser un entero entre 1 y 72."); return; }
    if (!Number.isInteger(c.actual) || c.actual < 1 || c.actual > c.total) { errores.push(donde + "la cuota actual debe ser un entero entre 1 y el total."); return; }
    limpias.push({ nombre: c.nombre.trim(), monto: c.monto, actual: c.actual, total: c.total });
  });
  return limpias;
}

function validarPresupuestos(obj, errores) {
  const limpios = {};
  if (!esObjetoPlano(obj)) {
    errores.push("Presupuestos: debe ser un objeto con una categoría y su monto.");
    return limpios;
  }
  Object.keys(obj).forEach(cat => {
    if (!RESP_CATEGORIAS_GASTO.includes(cat)) { errores.push("Presupuestos: la categoría \"" + cat.slice(0, 30) + "\" no existe."); return; }
    if (!esNumeroPositivo(obj[cat]))          { errores.push("Presupuestos, " + cat + ": el monto debe ser un número mayor a 0."); return; }
    limpios[cat] = obj[cat];
  });
  return limpios;
}

// Recibe el texto del archivo. Devuelve { ok:true, respaldo, datos } o { ok:false, errores:[...] }
function validarRespaldo(texto) {
  let raiz;
  try {
    raiz = JSON.parse(texto);
  } catch (error) {
    return { ok: false, errores: ["El archivo no es un JSON válido. ¿Seguro que es un respaldo de Cuadra?"] };
  }

  if (!esObjetoPlano(raiz) || raiz.app !== RESPALDO_APP) {
    return { ok: false, errores: ["Este archivo no parece un respaldo de Cuadra."] };
  }
  if (raiz.version !== RESPALDO_VERSION) {
    return { ok: false, errores: ["La versión del respaldo (" + String(raiz.version).slice(0, 10) + ") no es compatible con esta versión de Cuadra."] };
  }
  if (!esObjetoPlano(raiz.datos)) {
    return { ok: false, errores: ["El respaldo no contiene la sección \"datos\"."] };
  }

  const errores = [];
  const d = raiz.datos;
  const datos = {
    ingresos:     validarMovimientos(d.ingresos, "Ingresos", RESP_CATEGORIAS_INGRESO, errores),
    gastos:       validarMovimientos(d.gastos,   "Gastos",   RESP_CATEGORIAS_GASTO,   errores),
    cuotas:       validarCuotas(d.cuotas, errores),
    presupuestos: validarPresupuestos(d.presupuestos, errores),
  };

  if (errores.length > 0) return { ok: false, errores };
  return { ok: true, respaldo: raiz, datos };
}

// ---------- pantalla ----------

(function () {
  const btnExportar  = document.getElementById("btnExportarRespaldo");
  const btnRestaurar = document.getElementById("btnRestaurarRespaldo");
  const inputArchivo = document.getElementById("archivoRespaldo");
  const msg          = document.getElementById("msgRespaldo");
  const modalEl      = document.getElementById("modalRestaurar");
  if (!btnExportar || !btnRestaurar || !inputArchivo || !msg || !modalEl) return;

  const modal          = new bootstrap.Modal(modalEl);
  const resumenActual  = document.getElementById("resumenActual");
  const resumenArchivo = document.getElementById("resumenArchivo");
  const chkDescargar   = document.getElementById("chkDescargarAntes");
  const btnConfirmar   = document.getElementById("btnConfirmarRestaurar");

  let pendiente = null;   // datos ya validados, esperando la confirmación

  function mostrar(tipo, contenido) {
    msg.className = "aviso aviso-" + tipo + " mb-0 mt-3";
    msg.replaceChildren();
    if (Array.isArray(contenido)) {
      const lista = document.createElement("ul");
      lista.className = "mb-0 ps-3";
      contenido.slice(0, 6).forEach(t => {
        const li = document.createElement("li");
        li.textContent = t;
        lista.appendChild(li);
      });
      if (contenido.length > 6) {
        const li = document.createElement("li");
        li.textContent = "… y " + (contenido.length - 6) + " problema(s) más.";
        lista.appendChild(li);
      }
      msg.appendChild(lista);
    } else {
      msg.textContent = contenido;
    }
  }

  function ocultarMensaje() {
    msg.className = "aviso d-none mb-0 mt-3";
    msg.textContent = "";
  }

  function textoResumen(d) {
    return d.ingresos.length + " ingresos, " + d.gastos.length + " gastos, " +
           d.cuotas.length + " compras en cuotas y " + Object.keys(d.presupuestos).length + " presupuestos";
  }

  // si venimos de una restauración, avisar que salió bien
  try {
    const guardado = sessionStorage.getItem(RESPALDO_AVISO_CLAVE);
    if (guardado) {
      sessionStorage.removeItem(RESPALDO_AVISO_CLAVE);
      mostrar("info", guardado);
    }
  } catch (error) {}

  btnExportar.addEventListener("click", () => {
    try {
      const r = descargarRespaldo();
      mostrar("info", "Respaldo descargado con " + textoResumen(r.datos) + ".");
    } catch (error) {
      mostrar("peligro", "No se pudo generar el respaldo.");
    }
  });

  btnRestaurar.addEventListener("click", () => inputArchivo.click());

  inputArchivo.addEventListener("change", async () => {
    const archivo = inputArchivo.files[0];
    inputArchivo.value = "";          // permite volver a elegir el mismo archivo
    if (!archivo) return;
    ocultarMensaje();

    if (!/\.json$/i.test(archivo.name)) {
      mostrar("peligro", "El archivo debe tener extensión .json.");
      return;
    }
    if (archivo.size > RESPALDO_MAX_BYTES) {
      mostrar("peligro", "El archivo es demasiado grande para ser un respaldo de Cuadra (máximo 2 MB).");
      return;
    }

    let texto;
    try {
      texto = await archivo.text();
    } catch (error) {
      mostrar("peligro", "No se pudo leer el archivo.");
      return;
    }

    const resultado = validarRespaldo(texto);
    if (!resultado.ok) {
      mostrar("peligro", ["No se restauró nada. El archivo no es válido:"].concat(resultado.errores));
      return;
    }

    pendiente = resultado.datos;
    resumenActual.textContent  = textoResumen(cargarDatos());
    resumenArchivo.textContent = textoResumen(pendiente);
    chkDescargar.checked = true;
    modal.show();
  });

  modalEl.addEventListener("hidden.bs.modal", () => { pendiente = null; });

  btnConfirmar.addEventListener("click", () => {
    if (!pendiente) return;
    const nuevos = pendiente;

    try {
      if (chkDescargar.checked) descargarRespaldo();   // copia de lo actual antes de reemplazar
    } catch (error) {
      modal.hide();
      mostrar("peligro", "No se pudo descargar la copia de tus datos actuales, por eso no se restauró nada.");
      return;
    }

    if (!guardarDatos(nuevos)) {
      modal.hide();
      mostrar("peligro", "No se pudo guardar el respaldo. Revisa que tu navegador permita guardar datos. Tus datos actuales no se modificaron.");
      return;
    }

    try {
      sessionStorage.setItem(RESPALDO_AVISO_CLAVE, "Respaldo restaurado: " + textoResumen(nuevos) + ".");
    } catch (error) {}
    location.reload();
  });
})();
