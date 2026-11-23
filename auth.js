const PREFIJO      = "cts_";
const CLAVE_SESION = PREFIJO + "sesion";

function leerStorage(clave) {
  try {
    const texto = localStorage.getItem(clave);
    return texto ? JSON.parse(texto) : null;
  } catch (error) {
    return null;
  }
}

function escribirStorage(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
    return true;
  } catch (error) {
    return false;
  }
}

// generacion de hasheo y aleatorio
const COSTO_BCRYPT = 10;

function obtenerBcrypt() {
  const lib = (window.dcodeIO && window.dcodeIO.bcrypt) || window.bcrypt;
  if (!lib) throw new Error("No se pudo cargar bcrypt. Revisa tu conexión a internet.");
  return lib;
}

function hashClave(clave) {
  return obtenerBcrypt().hash(clave, COSTO_BCRYPT);
}

function verificarClave(clave, hash) {
  return obtenerBcrypt().compare(clave, hash);
}

// cuentas antiguas (SHA-256 + sal): se verifican asi y se migran a bcrypt al iniciar sesion
async function hashClaveLegacy(clave, sal) {
  const texto = sal + ":" + clave;

  if (window.crypto && crypto.subtle) {
    const bytes  = new TextEncoder().encode(texto);
    const buffer = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // respaldo simple por si el navegador no tiene crypto.subtle
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
  return "x" + (h >>> 0).toString(16);
}

function normalizarUsuario(usuario) {
  return String(usuario).trim().toLowerCase();
}

async function registrarUsuario(usuario, clave, alias, comuna) {
  const nombre = normalizarUsuario(usuario);
  alias = String(alias || "").trim();

  if (alias.length < 2 || alias.length > 30) {
    return { ok: false, mensaje: "Escribe tu alias (entre 2 y 30 caracteres)." };
  }
  if (!comuna) {
    return { ok: false, mensaje: "Selecciona la comuna donde vives." };
  }

  if (!/^[a-z0-9._-]{3,20}$/.test(nombre)) {
    return { ok: false, mensaje: "El usuario debe tener entre 3 y 20 caracteres: letras, números, punto, guion o guion bajo." };
  }
  if (clave.length < 6) {
    return { ok: false, mensaje: "La contraseña debe tener al menos 6 caracteres." };
  }
  if (leerStorage(PREFIJO + "user_" + nombre)) {
    return { ok: false, mensaje: "Ese usuario ya existe. Elige otro o inicia sesión." };
  }

  let hash;
  try {
    hash = await hashClave(clave);
  } catch (error) {
    return { ok: false, mensaje: error.message };
  }

  if (!escribirStorage(PREFIJO + "user_" + nombre, { hash, alias, comuna })) {
    return { ok: false, mensaje: "No se pudo guardar la cuenta. Revisa que tu navegador permita guardar datos." };
  }

  escribirStorage(CLAVE_SESION, nombre);   // queda con la sesión iniciada
  return { ok: true };
}

async function iniciarSesion(usuario, clave) {
  const nombre  = normalizarUsuario(usuario);
  const cuenta  = leerStorage(PREFIJO + "user_" + nombre);
  const errorGenerico = { ok: false, mensaje: "Usuario o contraseña incorrectos." };

  if (!cuenta) return errorGenerico;

  try {
    if (cuenta.sal) {
      const hashViejo = await hashClaveLegacy(clave, cuenta.sal);
      if (hashViejo !== cuenta.hash) return errorGenerico;

      const { sal, ...resto } = cuenta;
      escribirStorage(PREFIJO + "user_" + nombre, { ...resto, hash: await hashClave(clave) });
    } else {
      if (!(await verificarClave(clave, cuenta.hash))) return errorGenerico;
    }
  } catch (error) {
    return { ok: false, mensaje: error.message };
  }

  escribirStorage(CLAVE_SESION, nombre);
  return { ok: true };
}

function usuarioActual() {
  return leerStorage(CLAVE_SESION);
}

// alias(usu) y comuna de la cuenta 
function perfilActual() {
  const usuario = usuarioActual();
  if (!usuario) return null;
  const cuenta = leerStorage(PREFIJO + "user_" + usuario) || {};
  return { usuario, alias: cuenta.alias || usuario, comuna: cuenta.comuna || "" };
}

function cerrarSesion() {
  try { localStorage.removeItem(CLAVE_SESION); } catch (error) {}
  location.href = "login.html";
}

function hoyISO() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function cargarDatos() {
  const usuario = usuarioActual();
  const vacio = { ingresos: [], gastos: [], cuotas: [], presupuestos: {} };
  if (!usuario) return vacio;

  const g = leerStorage(PREFIJO + "datos_" + usuario);
  if (!g) return vacio;

  const hoy = hoyISO();
  const limpiar = (lista, catDef) => (Array.isArray(lista) ? lista : []).map(m => ({
    nombre: m.nombre, monto: Number(m.monto) || 0,
    categoria: m.categoria || catDef, fecha: m.fecha || hoy, descripcion: m.descripcion || "",
  }));

  let ingresos = limpiar(g.ingresos, "Otro");
  if (!Array.isArray(g.ingresos)) {
    if (Number(g.sueldoFijo) > 0)  ingresos.push({ nombre: "Sueldo fijo",  monto: Number(g.sueldoFijo),  categoria: "Sueldo",       fecha: hoy, descripcion: "" });
    if (Number(g.sueldoExtra) > 0) ingresos.push({ nombre: "Sueldo extra", monto: Number(g.sueldoExtra), categoria: "Sueldo extra", fecha: hoy, descripcion: "" });
  }

  return {
    ingresos,
    gastos: limpiar(g.gastos, "Otros"),
    cuotas: Array.isArray(g.cuotas) ? g.cuotas : [],
    presupuestos: (g.presupuestos && typeof g.presupuestos === "object") ? g.presupuestos : {},
  };
}

function guardarDatos(datos) {
  const usuario = usuarioActual();
  if (!usuario) return false;
  return escribirStorage(PREFIJO + "datos_" + usuario, datos);
}
