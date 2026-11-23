// consejos financieros.
// Recibe los números del mes y devuelve una lista de consejos con proyecciones a un año(SOLO UN YEAR.

const PORCENTAJE_AHORRO = 0.15;   // % de lo que queda libre que sugerimos ahorrar
const LIMITE_CUOTAS     = 0.30;   // si las cuotas superan este % del ingreso, avisamos

// Palabras CLAVE 
const PATRONES_HORMIGA = [
  /\bcigarro/, /\btabaco/, /\bvape/,
  /\bcafe/, /\bsnack/, /\bdulce/, /\btorta/, /\bhelado/, /\bgolosina/, /\bte/,
  /\bbebida/, /\benergetica/,
  /\bdelivery/, /\buber eats/, /\brappi/, /\bpedidos ?ya/, /\bcomida rapida/,
  /\bcerveza/, /\balcohol/, /\bcopete/,
  /\bnetflix/, /\bspotify/, /\bdisney/, /\bhbo/, /\byoutube/, /\bsuscripcion/,
  /\baliexpress/, /\btemu/, /\bshein/,
];

function formatoPesos(n) {
  return "$ " + Math.round(n).toLocaleString("es-CL");
}

function sinTildes(texto) {
  return String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function esGastoHormiga(nombre) {
  const limpio = sinTildes(nombre);
  return PATRONES_HORMIGA.some(patron => patron.test(limpio));
}

function textoMeses(meses) {
  if (meses < 24) return meses + (meses === 1 ? " mes" : " meses");
  return (meses / 12).toFixed(1).replace(".", ",") + " años";
}

// datos { ingresos, libre, gastos: [{nombre, monto}], cuotas: [{nombre, monto, actual, total}] }
function generarConsejos(datos) {
  const { ingresos, libre, gastos, cuotas } = datos;
  const consejos = [];

  if (ingresos <= 0) return consejos;

  const totalCuotas = cuotas.reduce((s, c) => s + c.monto, 0);
  const totalFijos  = gastos.reduce((s, g) => s + g.monto, 0);
  const totalGastos = totalCuotas + totalFijos;
  const hormigas    = gastos.filter(g => esGastoHormiga(g.nombre));
  const totalHormiga = hormigas.reduce((s, g) => s + g.monto, 0);

  // 1) Avisa si el sueldo no alcanza
  if (libre < 0) {
    const falta = Math.abs(libre);
    let texto = "Este mes te faltan " + formatoPesos(falta) + ". Para cuadrar tu presupuesto necesitas recortar al menos esa cantidad.";
    if (totalHormiga >= falta) {
      texto += " Solo eliminando tus gastos hormiga lo lograrías.";
    } else if (totalHormiga > 0) {
      texto += " Eliminar tus gastos hormiga cubriría " + formatoPesos(totalHormiga) + " de esa diferencia.";
    }
    consejos.push({ tipo: "alerta", icono: "bi-exclamation-triangle", titulo: "Prioridad: cuadrar el mes", texto });
  }

  // 2) Gasto hormiga
  hormigas.forEach(g => {
    consejos.push({
      tipo: "hormiga",
      icono: "bi-cup-hot",
      titulo: "Gasto hormiga: " + g.nombre,
      texto: "Gastas " + formatoPesos(g.monto) + " al mes en \"" + g.nombre + "\". Si lo eliminaras tendrías " +
             formatoPesos(g.monto) + " más libres al mes, y al año serían " + formatoPesos(g.monto * 12) + ".",
    });
  });
  if (hormigas.length > 1) {
    consejos.push({
      tipo: "hormiga",
      icono: "bi-cup-hot",
      titulo: "Todos tus gastos hormiga juntos",
      texto: "Sumados son " + formatoPesos(totalHormiga) + " al mes: " + formatoPesos(totalHormiga * 12) +
             " al año que podrías destinar a ahorro o a pagar deudas.",
    });
  }

  // 3) Ahorro sobre lo que queda libre
  if (libre > 0) {
    const mensual = Math.round(libre * PORCENTAJE_AHORRO);
    const alto    = Math.round(libre * 0.30);
    consejos.push({
      tipo: "ahorro",
      icono: "bi-piggy-bank",
      titulo: "Ahorra el 15% de lo que te queda",
      texto: "Si separas el 15% de tus " + formatoPesos(libre) + " libres (" + formatoPesos(mensual) +
             " al mes) y lo mantienes, en un año tendrás " + formatoPesos(mensual * 12) +
             " ahorrados. Si te animas al 30%, serían " + formatoPesos(alto * 12) + ".",
    });

    // Fondo de emergencia: 3 meses de gastos
    if (totalGastos > 0 && mensual > 0) {
      const meta   = totalGastos * 3;
      const meses  = Math.ceil(meta / mensual);
      if (meses <= 120) {
        consejos.push({
          tipo: "info",
          icono: "bi-shield-check",
          titulo: "Arma tu fondo de emergencia",
          texto: "Una meta común es tener 3 meses de gastos guardados (" + formatoPesos(meta) +
                 "). Ahorrando " + formatoPesos(mensual) + " al mes la alcanzarías en unos " + textoMeses(meses) + ".",
        });
      }
    }
  }

  // 4) Cuotas que están por terminar
  cuotas
    .map(c => ({ ...c, faltan: c.total - c.actual }))
    .filter(c => c.faltan <= 2)
    .sort((a, b) => a.faltan - b.faltan)
    .slice(0, 2)
    .forEach(c => {
      const liberado = formatoPesos(c.monto) + " más libres al mes (" + formatoPesos(c.monto * 12) + " al año)";
      const texto = c.faltan === 0
        ? "Este mes pagas la última cuota de \"" + c.nombre + "\". Desde el mes siguiente tendrás " + liberado + ". Planifica a dónde irá esa plata."
        : "Después de " + (c.faltan === 1 ? "1 cuota más" : c.faltan + " cuotas más") + " terminas de pagar \"" + c.nombre +
          "\". Desde entonces tendrás " + liberado + ".";
      consejos.push({ tipo: "info", icono: "bi-calendar-check", titulo: "Una deuda está por terminar", texto });
    });

  // 5) Demasiado ingreso comprometido en cuotas
  if (totalCuotas > ingresos * LIMITE_CUOTAS) {
    const pct = Math.round((totalCuotas / ingresos) * 100);
    consejos.push({
      tipo: "alerta",
      icono: "bi-credit-card-2-front",
      titulo: "Muchas cuotas",
      texto: "Tus cuotas se llevan el " + pct + "% de tus ingresos (" + formatoPesos(totalCuotas) +
             " al mes). Se suele recomendar no pasar del 30%. Evita sumar nuevas compras en cuotas hasta terminar alguna.",
    });
  }

  return consejos;
}

// Resumen de un mes ("AAAA-MM"): mismos cálculos que la página de inicio
function resumenMes(datos, mes) {
  const ingresosLista = datos.ingresos.filter(i => i.fecha.startsWith(mes));
  const gastosLista   = datos.gastos.filter(g => g.fecha.startsWith(mes));
  const ingresos      = ingresosLista.reduce((s, i) => s + i.monto, 0);
  const gastosTotal   = gastosLista.reduce((s, g) => s + g.monto, 0) + datos.cuotas.reduce((s, q) => s + q.monto, 0);
  return { ingresosLista, gastosLista, ingresos, gastosTotal, libre: ingresos - gastosTotal };
}

function mesActualISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

// Consejos básicos de ahorro (ver como estan o agrear mas)
const CONSEJOS_BASICOS = [
  { tipo: "info",   icono: "bi-pie-chart",       titulo: "Regla 50/30/20",           texto: "Destina cerca del 50% de tus ingresos a necesidades (arriendo, comida, transporte), 30% a gustos y 20% a ahorro o pago de deudas. Ajústala a tu realidad." },
  { tipo: "ahorro", icono: "bi-piggy-bank",      titulo: "Págate a ti primero",      texto: "Apenas recibas tu sueldo, separa el monto que quieres ahorrar. Es más fácil que intentar ahorrar lo que sobre a fin de mes." },
  { tipo: "info",   icono: "bi-shield-check",    titulo: "Fondo de emergencia",      texto: "Parte con una meta pequeña y llega a tener guardados 3 meses de gastos básicos. Te evita endeudarte ante un imprevisto." },
  { tipo: "hormiga",icono: "bi-cup-hot",         titulo: "Cuidado con los gastos hormiga", texto: "Cafés, delivery y suscripciones parecen pequeños, pero sumados al año pesan bastante. Revísalos una vez al mes." },
  { tipo: "alerta", icono: "bi-credit-card-2-front", titulo: "Piensa antes de comprar en cuotas", texto: "Las cuotas comprometen tus ingresos de meses futuros. Intenta que no superen el 30% de lo que ganas." },
  { tipo: "info",   icono: "bi-journal-text",    titulo: "Anota todo",               texto: "Registrar cada ingreso y gasto, aunque sea pequeño, es el primer paso para saber a dónde se va tu plata." },
  { tipo: "ahorro", icono: "bi-bullseye",        titulo: "Define un presupuesto por categoría", texto: "Ponle un tope mensual a categorías como Ocio o Alimentación y revisa la barra de avance para no pasarte." },
  { tipo: "info",   icono: "bi-graph-up-arrow",  titulo: "Revisa tu evolución",      texto: "Mira mes a mes si tus gastos suben o bajan. Si un mes te desordenas, corrige en el siguiente." },
];

function renderConsejos(contenedor, lista) {
  contenedor.innerHTML = "";
  lista.forEach(c => {
    const caja = document.createElement("div");
    caja.className = "consejo consejo-" + c.tipo;
    const icono = document.createElement("i");
    icono.className = "bi " + c.icono;
    const cuerpo = document.createElement("div");
    const titulo = document.createElement("div");
    titulo.className = "consejo-titulo";
    titulo.textContent = c.titulo;
    const texto = document.createElement("p");
    texto.className = "consejo-texto";
    texto.textContent = c.texto;
    cuerpo.append(titulo, texto);
    caja.append(icono, cuerpo);
    contenedor.appendChild(caja);
  });
}
