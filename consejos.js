// Motor de consejos financieros.
// Recibe los números del mes y devuelve una lista de consejos con proyecciones a un año(SOLO UN YEAR.

const PORCENTAJE_AHORRO = 0.15;   // % de lo que queda libre que sugerimos ahorrar
const LIMITE_CUOTAS     = 0.30;   // si las cuotas superan este % del ingreso, avisamos

// Palabras CLAVE (PONER OJO ACA, AGREAGR MAS PALABRAS ANGEL)
const PATRONES_HORMIGA = [
  /\bcigarr/, /\btabaco/, /\bvape/,
  /\bcafe/, /\bsnack/, /\bdulce/, /\bhelado/, /\bgolosina/,
  /\bbebida/, /\benergetica/,
  /\bdelivery/, /\buber eats/, /\brappi/, /\bpedidos ?ya/, /\bcomida rapida/,
  /\bcerveza/, /\balcohol/, /\bcopete/,
  /\bnetflix/, /\bspotify/, /\bdisney/, /\bhbo/, /\byoutube/, /\bsuscripcion/,
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

// datos: { ingresos, libre, gastos: [{nombre, monto}], cuotas: [{nombre, monto, actual, total}] }
function generarConsejos(datos) {
  const { ingresos, libre, gastos, cuotas } = datos;
  const consejos = [];

  if (ingresos <= 0) return consejos;

  const totalCuotas = cuotas.reduce((s, c) => s + c.monto, 0);
  const totalFijos  = gastos.reduce((s, g) => s + g.monto, 0);
  const totalGastos = totalCuotas + totalFijos;
  const hormigas    = gastos.filter(g => esGastoHormiga(g.nombre));
  const totalHormiga = hormigas.reduce((s, g) => s + g.monto, 0);

  // 1) Avisisa si el sueldo no alcanza
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
