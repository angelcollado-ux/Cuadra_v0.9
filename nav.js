// menu para todas las pag 
// Uso: <div id="navbar" data-activa="inicio|graficos|consejos"></div>  (después de cargar auth.js)
(function () {
  const cont = document.getElementById("navbar");
  if (!cont) return;
  const activa = cont.dataset.activa;
  const perfil = perfilActual() || { alias: "", comuna: "" };

  const enlaces = [
    ["inicio",       "index.html",              "Inicio"],
    ["presupuestos", "index.html#presupuestos", "Presupuestos"],
    ["graficos",     "graficos.html",           "Gráficos"],
    ["consejos",     "consejos.html",           "Consejos financieros"],
  ];
  const items = enlaces.map(([id, url, texto]) =>
    '<li class="nav-item"><a class="nav-link' + (id === activa ? ' active" aria-current="page' : '') +
    '" href="' + url + '">' + texto + '</a></li>').join("");

  cont.innerHTML =
    '<nav class="navbar navbar-expand-md navbar-dark border-bottom border-dark-subtle">' +
      '<div class="container">' +
        '<a class="navbar-brand fw-semibold" href="index.html">CUADRA</a>' +
        '<button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#menu" aria-controls="menu" aria-expanded="false" aria-label="Abrir menú"><span class="navbar-toggler-icon"></span></button>' +
        '<div class="collapse navbar-collapse" id="menu">' +
          '<ul class="navbar-nav ms-auto">' + items + '</ul>' +
          '<div class="d-flex align-items-center gap-2 ms-md-3 mt-2 mt-md-0">' +
            '<span class="small text-secondary"><i class="bi bi-person-circle me-1"></i><span id="nombreUsuario"></span></span>' +
            '<button type="button" id="btnSalir" class="btn btn-agregar">Cerrar sesión</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</nav>';

  document.getElementById("nombreUsuario").textContent =
    perfil.alias + (perfil.comuna ? " · " + perfil.comuna : "");
  document.getElementById("btnSalir").addEventListener("click", cerrarSesion);
})();
