import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

let plantaActual = null;
let procesoActual = null;
let fechaActual = null;
let tableroRefsActuales = [];
let detenerEscuchasTablero = [];
let guardadoTimer = null;
let aplicandoCambiosRemotos = false;

const TODOS_PROCESOS = "__todos__";
const firebaseConfig = {
  apiKey: "AIzaSyCucvrCSn9zdCW1v9m1BlP5KH91A5z15ik",
  authDomain: "pizarron-produccion.firebaseapp.com",
  projectId: "pizarron-produccion",
  storageBucket: "pizarron-produccion.firebasestorage.app",
  messagingSenderId: "969656464150",
  appId: "1:969656464150:web:7b7a7ecbdc06038d67d637"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const HORAS_PRODUCTIVAS = 9;
const DIAS_PRODUCTIVOS = 5;
const METAS_POR_PLANTA = {
  "1": { semanal: 4200 },
  "2": { semanal: 2000 },
  "3": { semanal: 2000 },
  "4": { semanal: 8200 },
  "5": { semanal: 0 }
};
const PROCESOS_POR_PLANTA = {
  "1": ["Pespunte", "Por montar", "Montado", "Acabado", "Adorno"],
  "2": ["Pespunte", "Por montar", "Montado", "Acabado", "Adorno"],
  "3": ["Pespunte", "Por montar", "Montado", "Acabado", "Adorno"],
  "4": ["Corte", "Preliminares", "Bordado", "Maquilas"]
};
const PROCESO_FINAL_POR_PLANTA = {
  "1": "Adorno",
  "2": "Adorno",
  "3": "Adorno",
  "4": "Maquilas"
};
const HORAS_JORNADA = [
  "8:00 A 9:00",
  "9:00 A 10:00",
  "10:00 A 11:00",
  "11:00 A 12:00",
  "12:00 A 1:00",
  "1:00 A 2:00",
  "2:00 A 3:00",
  "3:00 A 4:00",
  "4:00 A 5:00",
  "5:00 A 6:00"
];
const COMIDA_POR_PLANTA_PROCESO = {
  "1": {
    Pespunte: "2:00 A 3:00",
    "Por montar": "1:00 A 2:00",
    Montado: "1:00 A 2:00",
    Acabado: "1:00 A 2:00",
    Adorno: "1:00 A 2:00"
  },
  "2": {
    Pespunte: "12:00 A 1:00",
    "Por montar": "1:00 A 2:00",
    Montado: "1:00 A 2:00",
    Acabado: "1:00 A 2:00",
    Adorno: "1:00 A 2:00"
  },
  "3": {
    Pespunte: "1:00 A 2:00",
    "Por montar": "2:00 A 3:00",
    Montado: "2:00 A 3:00",
    Acabado: "2:00 A 3:00",
    Adorno: "2:00 A 3:00"
  },
  "4": {
    Corte: "12:00 A 1:00",
    Preliminares: "12:00 A 1:00",
    Bordado: "12:00 A 1:00",
    Maquilas: "12:00 A 1:00"
  }
};
const CAMPOS_CAPTURA = [
  { id: "pares", tipo: "number", clase: "pares", label: "Pares producidos" },
  { id: "causaParo", tipo: "text", label: "Causa de paro" },
  { id: "afectadosIng", tipo: "number", clase: "afectadosIng", label: "Pares afectados ingenieria" },
  { id: "calidad", tipo: "percent", clase: "calidad", label: "Indicador de calidad" },
  { id: "defectos", tipo: "number", clase: "defectos", label: "Pares defectuosos" },
  { id: "paroMtto", tipo: "text", label: "Paro mantenimiento" },
  { id: "afectadosMtto", tipo: "number", clase: "afectadosMtto", label: "Pares afectados mantenimiento" },
  { id: "faltaMaterial", tipo: "text", label: "Falta material" },
  { id: "afectadosCompras", tipo: "number", clase: "afectadosCompras", label: "Pares afectados compras" },
  { id: "paroDesarrollo", tipo: "text", label: "Paro desarrollo" },
  { id: "afectadosDesarrollo", tipo: "number", clase: "afectadosDesarrollo", label: "Pares afectados desarrollo" },
  { id: "inventario", tipo: "number", clase: "inventario", label: "Inventario" },
  { id: "entregados", tipo: "number", clase: "entregados", label: "Pares entregados" }
];
const CAMPOS_TOTAL_PROCESO = [
  { clase: "pares", campo: "pares" },
  { clase: "afectadosIng", campo: "afectadosIng" },
  { clase: "calidad", campo: "calidad" },
  { clase: "defectos", campo: "defectos" },
  { clase: "afectadosMtto", campo: "afectadosMtto" },
  { clase: "afectadosCompras", campo: "afectadosCompras" },
  { clase: "afectadosDesarrollo", campo: "afectadosDesarrollo" },
  { clase: "inventario", campo: "inventario" },
  { clase: "entregados", campo: "entregados" }
];

document.addEventListener("DOMContentLoaded", () => {
  actualizarMeta();
  document.getElementById("selectFecha").valueAsDate = new Date();

  document.getElementById("selectPlanta").addEventListener("change", () => {
    actualizarProcesos();
    validarSeleccion();
  });
  document.getElementById("selectProceso").addEventListener("change", validarSeleccion);
  document.getElementById("selectFecha").addEventListener("change", validarSeleccion);
  document.getElementById("btnResumenDiario").addEventListener("click", mostrarResumenDiario);
  document.getElementById("btnResumenSemanal").addEventListener("click", mostrarResumenSemanal);
  document.getElementById("btnCerrarResumen").addEventListener("click", cerrarModalResumen);
  document.getElementById("btnImprimir").addEventListener("click", () => window.print());

  actualizarProcesos();
  validarSeleccion();
});

function validarSeleccion() {
  const planta = document.getElementById("selectPlanta").value;
  const proceso = document.getElementById("selectProceso").value;
  const fecha = document.getElementById("selectFecha").value;
  const tituloProceso = proceso === TODOS_PROCESOS ? "Todos los procesos" : proceso;

  document.getElementById("tituloProceso").textContent = tituloProceso || "Selecciona proceso";
  document.getElementById("fechaLabel").textContent = fecha ? formatearFecha(fecha) : "";

  plantaActual = planta;
  procesoActual = proceso;
  fechaActual = fecha;
  actualizarMeta();

  if (planta && proceso && fecha) {
    cargarTabla();
    return;
  }

  limpiarTabla();
  actualizarEstado(false);
}

function formatearFecha(fecha) {
  const [year, month, day] = fecha.split("-");
  const f = new Date(year, month - 1, day);

  return f.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).toUpperCase();
}

function cargarTabla() {
  const tabla = document.getElementById("tabla");
  const procesos = obtenerProcesosSeleccionados();

  tabla.innerHTML = "";

  procesos.forEach(proceso => {
    tabla.innerHTML += generarEncabezadoProceso(proceso);
    cargarFilasProceso(tabla, proceso);
  });

  activarEventosCaptura();
  calcularTotales();
  conectarTableroTiempoReal();
}

function cargarFilasProceso(tabla, proceso) {
  const metasPorHora = obtenerMetasPorHora(plantaActual);
  const horaComida = obtenerHoraComida(plantaActual, proceso);
  let horaProductiva = 0;

  HORAS_JORNADA.forEach(hora => {
    if (hora === horaComida) {
      tabla.innerHTML += `
        <tr class="fila-comida">
          <td>-</td>
          <td>${hora}</td>
          <td colspan="13">TIEMPO DE COMIDA - ${proceso}</td>
        </tr>
      `;
      return;
    }

    tabla.innerHTML += `
      <tr>
        <td>${metasPorHora[horaProductiva]} PARES</td>
        <td>${hora}</td>
        ${generarInputs(proceso, hora)}
      </tr>
    `;
    horaProductiva += 1;
  });

  tabla.innerHTML += generarTotalProceso(proceso);
}

function generarEncabezadoProceso(proceso) {
  const horaComida = obtenerHoraComida(plantaActual, proceso);

  return `
    <tr class="proceso-separador">
      <td colspan="15">
        <span>${proceso}</span>
        <small>Comida: ${horaComida}</small>
      </td>
    </tr>
  `;
}

function generarInputs(proceso, hora) {
  return CAMPOS_CAPTURA.map(campo => {
    const clase = campo.clase ? ` class="${campo.clase}"` : "";
    const min = campo.tipo === "number" ? ' min="0"' : "";

    if (campo.tipo === "text") {
      return `
        <td class="celda-texto">
          <textarea
            class="texto-captura"
            rows="1"
            data-proceso="${proceso}"
            data-hora="${hora}"
            data-campo="${campo.id}"
            aria-label="${campo.label}"></textarea>
        </td>
      `;
    }

    if (campo.tipo === "percent") {
      return `
        <td>
          <input
            type="text"
            inputmode="decimal"
            class="${campo.clase}"
            data-tipo="percent"
            data-proceso="${proceso}"
            data-hora="${hora}"
            data-campo="${campo.id}"
            aria-label="${campo.label}">
        </td>
      `;
    }

    return `
      <td>
        <input
          type="${campo.tipo}"
          ${min}
          ${clase}
          data-proceso="${proceso}"
          data-hora="${hora}"
          data-campo="${campo.id}"
          aria-label="${campo.label}">
      </td>
    `;
  }).join("");
}

function generarTotalProceso(proceso) {
  return `
    <tr class="total-proceso" data-proceso-total="${proceso}">
      <td>Total</td>
      <td>${proceso}</td>
      <td data-total-proceso="${proceso}" data-campo-total="pares">0</td>
      <td></td>
      <td data-total-proceso="${proceso}" data-campo-total="afectadosIng">0</td>
      <td data-total-proceso="${proceso}" data-campo-total="calidad">0</td>
      <td data-total-proceso="${proceso}" data-campo-total="defectos">0</td>
      <td></td>
      <td data-total-proceso="${proceso}" data-campo-total="afectadosMtto">0</td>
      <td></td>
      <td data-total-proceso="${proceso}" data-campo-total="afectadosCompras">0</td>
      <td></td>
      <td data-total-proceso="${proceso}" data-campo-total="afectadosDesarrollo">0</td>
      <td data-total-proceso="${proceso}" data-campo-total="inventario">0</td>
      <td data-total-proceso="${proceso}" data-campo-total="entregados">0</td>
    </tr>
  `;
}

function activarEventosCaptura() {
  const inputs = document.querySelectorAll("#tabla input, #tabla textarea");

  inputs.forEach(input => {
    input.addEventListener("input", calcularTotales);
    input.addEventListener("input", programarGuardadoTablero);
    input.addEventListener("input", () => ajustarAlturaTexto(input));
    input.addEventListener("blur", () => normalizarCampoPorcentaje(input));
    ajustarAlturaTexto(input);
  });
}

function calcularTotales() {
  actualizarVisibilidadTotalGeneral();
  const pares = calcularColumna("pares", "total-pares");
  const afectadosIng = calcularColumna("afectadosIng", "total-afectadosIng");
  const calidad = calcularColumna("calidad", "total-calidad");
  const defectos = calcularColumna("defectos", "total-defectos");
  const afectadosMtto = calcularColumna("afectadosMtto", "total-afectadosMtto");
  const afectadosCompras = calcularColumna("afectadosCompras", "total-afectadosCompras");
  const afectadosDesarrollo = calcularColumna("afectadosDesarrollo", "total-afectadosDesarrollo");
  const inventario = calcularColumna("inventario", "total-inventario");
  const entregados = calcularColumna("entregados", "total-entregados");

  calcularTotalesPorProceso();
  actualizarKpis();
}

function calcularColumna(clase, idTotal) {
  let suma = 0;
  const inputs = document.querySelectorAll(`.${clase}`);

  inputs.forEach(input => {
    suma += numero(input.value);
  });

  const celda = document.getElementById(idTotal);

  if (celda) {
    celda.textContent = suma;
  }

  return suma;
}

function calcularTotalesPorProceso() {
  document.querySelectorAll(".total-proceso").forEach(filaTotal => {
    const proceso = filaTotal.dataset.procesoTotal;

    CAMPOS_TOTAL_PROCESO.forEach(total => {
      const suma = sumarColumnaPorProceso(proceso, total.clase);
      const celda = filaTotal.querySelector(`[data-campo-total="${total.campo}"]`);

      if (celda) {
        celda.textContent = suma;
      }
    });
  });
}

function sumarColumnaPorProceso(proceso, clase) {
  let suma = 0;
  const inputs = document.querySelectorAll(`.${clase}`);

  inputs.forEach(input => {
    if (input.dataset.proceso === proceso) {
      suma += numero(input.value);
    }
  });

  return suma;
}

function actualizarVisibilidadTotalGeneral() {
  const tfoot = document.querySelector(".excel tfoot");

  if (tfoot) {
    tfoot.hidden = procesoActual === TODOS_PROCESOS;
  }
}

function actualizarKpis() {
  const resumen = document.getElementById("resumenKpis");

  if (!resumen) {
    return;
  }

  const procesos = obtenerProcesosSeleccionados();

  if (procesoActual === TODOS_PROCESOS) {
    resumen.classList.add("summary-grid-procesos");
    resumen.innerHTML = procesos.map(proceso => generarKpiProceso(proceso)).join("");
    return;
  }

  resumen.classList.remove("summary-grid-procesos");
  resumen.innerHTML = generarKpisProcesoIndividual(procesos[0]);
}

function generarKpiProceso(proceso) {
  const datos = obtenerResumenProceso(proceso);

  return `
    <article class="metric-card metric-card-proceso">
      <span>${proceso}</span>
      <strong>${datos.pares}</strong>
      <small>Meta ${datos.meta} | Afectados ${datos.afectados} | Entregados ${datos.entregados}</small>
    </article>
  `;
}

function generarKpisProcesoIndividual(proceso) {
  const datos = obtenerResumenProceso(proceso);

  return `
    <article class="metric-card">
      <span>Meta diaria</span>
      <strong id="kpi-meta">${datos.meta}</strong>
      <small>${proceso || "Proceso"} programado</small>
    </article>
    <article class="metric-card">
      <span>Pares producidos</span>
      <strong id="kpi-pares">${datos.pares}</strong>
      <small>capturados</small>
    </article>
    <article class="metric-card warning">
      <span>Pares afectados</span>
      <strong id="kpi-afectados">${datos.afectados}</strong>
      <small>paros y faltantes</small>
    </article>
    <article class="metric-card success">
      <span>Entregados</span>
      <strong id="kpi-entregados">${datos.entregados}</strong>
      <small>al cierre</small>
    </article>
  `;
}

function obtenerResumenProceso(proceso) {
  const afectadosIng = sumarColumnaPorProceso(proceso, "afectadosIng");
  const afectadosMtto = sumarColumnaPorProceso(proceso, "afectadosMtto");
  const afectadosCompras = sumarColumnaPorProceso(proceso, "afectadosCompras");
  const afectadosDesarrollo = sumarColumnaPorProceso(proceso, "afectadosDesarrollo");
  const defectos = sumarColumnaPorProceso(proceso, "defectos");

  return {
    meta: obtenerMetaDiaria(plantaActual),
    pares: sumarColumnaPorProceso(proceso, "pares"),
    afectados: afectadosIng + afectadosMtto + afectadosCompras + afectadosDesarrollo + defectos,
    entregados: sumarColumnaPorProceso(proceso, "entregados")
  };
}

function actualizarProcesos() {
  const planta = document.getElementById("selectPlanta").value;
  const selectProceso = document.getElementById("selectProceso");
  const procesos = PROCESOS_POR_PLANTA[planta] || [];

  selectProceso.innerHTML = "";
  selectProceso.appendChild(crearOpcion("", procesos.length ? "Selecciona proceso" : "Selecciona planta primero"));
  selectProceso.disabled = procesos.length === 0;

  if (procesos.length) {
    selectProceso.appendChild(crearOpcion(TODOS_PROCESOS, "Todos los procesos"));
    selectProceso.value = TODOS_PROCESOS;
  }

  procesos.forEach(proceso => {
    selectProceso.appendChild(crearOpcion(proceso, proceso));
  });
}

function crearOpcion(valor, texto) {
  const opcion = document.createElement("option");
  opcion.value = valor;
  opcion.textContent = texto;
  return opcion;
}

function obtenerMetaDiaria(planta) {
  const metaSemanal = METAS_POR_PLANTA[planta]?.semanal || 0;
  return metaSemanal / DIAS_PRODUCTIVOS;
}

function obtenerHoraComida(planta, proceso) {
  return COMIDA_POR_PLANTA_PROCESO[planta]?.[proceso] || "";
}

function obtenerProcesosSeleccionados() {
  if (procesoActual === TODOS_PROCESOS) {
    return PROCESOS_POR_PLANTA[plantaActual] || [];
  }

  return procesoActual ? [procesoActual] : [];
}

function obtenerMetasPorHora(planta) {
  const metaDiaria = obtenerMetaDiaria(planta);
  const base = Math.floor(metaDiaria / HORAS_PRODUCTIVAS);
  const sobrante = metaDiaria % HORAS_PRODUCTIVAS;

  return Array.from({ length: HORAS_PRODUCTIVAS }, (_, index) => {
    return base + (index < sobrante ? 1 : 0);
  });
}

function actualizarMeta() {
  const kpiMeta = document.getElementById("kpi-meta");

  if (kpiMeta) {
    kpiMeta.textContent = obtenerMetaDiaria(plantaActual);
  }
}

function conectarTableroTiempoReal() {
  desconectarTableroTiempoReal();

  const procesos = obtenerProcesosSeleccionados();
  actualizarEstado(true, "Conectando...");

  tableroRefsActuales = procesos.map(proceso => {
    return {
      proceso,
      ref: doc(db, "tableros-produccion", crearIdTablero(proceso))
    };
  });

  detenerEscuchasTablero = tableroRefsActuales.map(tablero => {
    return onSnapshot(tablero.ref, snapshot => {
      aplicarDatosRemotosProceso(tablero.proceso, snapshot.exists() ? snapshot.data() : {});
      actualizarEstado(true, "En tiempo real");
    }, error => {
      console.error("Error al escuchar Firebase:", error);
      actualizarEstado(false, "Sin conexion a Firebase");
    });
  });
}

function desconectarTableroTiempoReal() {
  detenerEscuchasTablero.forEach(detener => detener());

  detenerEscuchasTablero = [];
  tableroRefsActuales = [];
  clearTimeout(guardadoTimer);
}

function crearIdTablero(proceso = procesoActual) {
  const procesoId = encodeURIComponent(proceso);
  return `${fechaActual}__P${plantaActual}__${procesoId}`;
}

function programarGuardadoTablero() {
  if (!tableroRefsActuales.length || aplicandoCambiosRemotos) {
    return;
  }

  actualizarEstado(true, "Guardando...");
  clearTimeout(guardadoTimer);
  guardadoTimer = setTimeout(guardarTablero, 350);
}

async function guardarTablero() {
  if (!tableroRefsActuales.length) {
    return;
  }

  try {
    await Promise.all(tableroRefsActuales.map(tablero => {
      return setDoc(tablero.ref, obtenerDatosProceso(tablero.proceso), { merge: true });
    }));
    actualizarEstado(true, "Guardado");
  } catch (error) {
    console.error("Error al guardar Firebase:", error);
    actualizarEstado(false, "Error al guardar");
  }
}

function obtenerDatosProceso(procesoCaptura) {
  const filas = {};

  document.querySelectorAll("#tabla input, #tabla textarea").forEach(input => {
    const proceso = input.dataset.proceso;
    const hora = input.dataset.hora;
    const campo = input.dataset.campo;

    if (proceso !== procesoCaptura) {
      return;
    }

    if (!filas[hora]) {
      filas[hora] = {};
    }

    filas[hora][campo] = input.dataset.tipo === "percent" ? obtenerValorPorcentaje(input.value) : input.value;
  });

  return {
    fecha: fechaActual,
    planta: plantaActual,
    proceso: procesoCaptura,
    filas,
    actualizadoEn: serverTimestamp()
  };
}

function aplicarDatosRemotosProceso(procesoCaptura, datos) {
  const filas = datos.filas?.[procesoCaptura] || datos.filas || {};

  aplicandoCambiosRemotos = true;

  document.querySelectorAll("#tabla input, #tabla textarea").forEach(input => {
    if (input.dataset.proceso !== procesoCaptura) {
      return;
    }

    const valorRemoto = filas[input.dataset.hora]?.[input.dataset.campo];

    if (valorRemoto === undefined || document.activeElement === input) {
      return;
    }

    input.value = input.dataset.tipo === "percent" ? formatearPorcentaje(valorRemoto) : valorRemoto;
    ajustarAlturaTexto(input);
  });

  aplicandoCambiosRemotos = false;
  calcularTotales();
}

async function mostrarResumenDiario() {
  if (!validarFiltrosResumen()) {
    return;
  }

  abrirModalResumen("Resumen diario", `Planta ${plantaActual} | ${formatearFecha(fechaActual)}`, "Cargando resumen...");

  try {
    const documentos = await consultarTablerosPorFechas(fechaActual, fechaActual);
    const resumen = resumirDocumentos(documentos);
    mostrarTablaResumenDiario(resumen, fechaActual);
  } catch (error) {
    console.error("Error al cargar resumen diario:", error);
    mostrarErrorResumen("No se pudo cargar el resumen diario.");
  }
}

async function mostrarResumenSemanal() {
  if (!validarFiltrosResumen()) {
    return;
  }

  const rango = obtenerRangoSemana(fechaActual);
  abrirModalResumen(
    "Resumen semanal",
    `Planta ${plantaActual} | ${formatearFecha(rango.inicio)} - ${formatearFecha(rango.fin)}`,
    "Cargando resumen..."
  );

  try {
    const documentos = await consultarTablerosPorFechas(rango.inicio, rango.fin);
    const resumen = resumirDocumentos(documentos);
    mostrarTablaResumenSemanal(resumen, rango);
  } catch (error) {
    console.error("Error al cargar resumen semanal:", error);
    mostrarErrorResumen("No se pudo cargar el resumen semanal.");
  }
}

function validarFiltrosResumen() {
  if (!plantaActual || !fechaActual) {
    abrirModalResumen("Resumen", "Selecciona planta y fecha", "Selecciona una planta y una fecha para generar el resumen.");
    return false;
  }

  return true;
}

async function consultarTablerosPorFechas(fechaInicio, fechaFin) {
  const ref = collection(db, "tableros-produccion");
  const consulta = query(
    ref,
    where("planta", "==", plantaActual)
  );
  const snapshot = await getDocs(consulta);

  return snapshot.docs
    .map(documento => documento.data())
    .filter(datos => datos.fecha >= fechaInicio && datos.fecha <= fechaFin);
}

function resumirDocumentos(documentos) {
  const resumen = {};

  documentos.forEach(datos => {
    const fecha = datos.fecha || "Sin fecha";
    const proceso = datos.proceso || "Sin proceso";

    if (!resumen[fecha]) {
      resumen[fecha] = {};
    }

    resumen[fecha][proceso] = sumarFilas(datos.filas || {});
  });

  return resumen;
}

function sumarFilas(filas) {
  const total = {
    pares: 0,
    afectados: 0,
    calidad: 0,
    calidadSuma: 0,
    calidadConteo: 0,
    defectos: 0,
    inventario: 0,
    entregados: 0
  };

  Object.values(filas).forEach(fila => {
    const calidad = numero(fila.calidad);

    total.pares += numero(fila.pares);
    total.afectados += numero(fila.afectadosIng) + numero(fila.afectadosMtto) +
      numero(fila.afectadosCompras) + numero(fila.afectadosDesarrollo) + numero(fila.defectos);
    total.calidadSuma += calidad;
    total.calidadConteo += fila.calidad === "" || fila.calidad === undefined ? 0 : 1;
    total.defectos += numero(fila.defectos);
    total.inventario += numero(fila.inventario);
    total.entregados += numero(fila.entregados);
  });

  total.calidad = calcularPromedioCalidad(total);
  return total;
}

function numero(valor) {
  return obtenerValorPorcentaje(valor);
}

function obtenerValorPorcentaje(valor) {
  const limpio = String(valor ?? "").replace("%", "").trim();
  const numeroValor = parseFloat(limpio);

  return Number.isNaN(numeroValor) ? 0 : numeroValor;
}

function formatearPorcentaje(valor) {
  const numeroValor = obtenerValorPorcentaje(valor);

  if (!numeroValor && String(valor ?? "").trim() === "") {
    return "";
  }

  return `${Number.isInteger(numeroValor) ? numeroValor : numeroValor.toFixed(1)}%`;
}

function normalizarCampoPorcentaje(input) {
  if (input.dataset.tipo !== "percent") {
    return;
  }

  input.value = formatearPorcentaje(input.value);
}

function mostrarTablaResumenDiario(resumen, fecha) {
  const procesos = obtenerProcesosOrdenados(resumen[fecha] || {});

  if (!procesos.length) {
    mostrarErrorResumen("No hay capturas guardadas para ese día.");
    return;
  }

  const filas = procesos.map(proceso => generarFilaResumen(proceso, resumen[fecha][proceso])).join("");
  const totalOperativo = obtenerTotalOperativo(resumen[fecha]);

  document.getElementById("modalContenido").innerHTML = `
    ${generarGraficaDiaria(resumen[fecha], totalOperativo)}
    <div class="resumen-scroll">
      <table class="tabla-resumen">
        <thead>${encabezadoResumen("Proceso")}</thead>
        <tbody>
          ${filas}
          ${generarFilaResumen(etiquetaTotalOperativo(), totalOperativo, true)}
        </tbody>
      </table>
    </div>
  `;
}

function mostrarTablaResumenSemanal(resumen, rango) {
  const fechas = obtenerFechasRango(rango.inicio, rango.fin);
  const procesos = PROCESOS_POR_PLANTA[plantaActual] || [];
  const filas = [];

  fechas.forEach(fecha => {
    procesos.forEach(proceso => {
      const datos = resumen[fecha]?.[proceso];

      if (datos) {
        filas.push(generarFilaResumen(`${formatearFechaCorta(fecha)} | ${proceso}`, datos));
      }
    });
  });

  if (!filas.length) {
    mostrarErrorResumen("No hay capturas guardadas para esa semana.");
    return;
  }

  document.getElementById("modalContenido").innerHTML = `
    ${generarGraficaSemanal(resumen, fechas, rango)}
    <div class="resumen-scroll">
      <table class="tabla-resumen">
        <thead>${encabezadoResumen("Día / Proceso")}</thead>
        <tbody>
          ${filas.join("")}
          ${generarFilaResumen(`Total semanal ${etiquetaProcesoFinal()}`, sumarSemanaOperativa(resumen), true)}
        </tbody>
      </table>
    </div>
  `;
}

function generarGraficaDiaria(procesos, totalOperativo = obtenerTotalOperativo(procesos || {})) {
  const entradas = obtenerProcesosOrdenados(procesos || {}).map(proceso => [proceso, procesos[proceso]]);
  const meta = obtenerMetaDiaria(plantaActual);
  const maximo = Math.max(1, meta, ...entradas.map(([, datos]) => datos.pares));
  const cumplimiento = calcularCumplimiento(totalOperativo.pares, meta);

  return `
    <section class="resumen-grafica" aria-label="Grafica diaria">
      <div class="grafica-header">
        <div>
          <span class="eyebrow">Vista ejecutiva</span>
          <h3>Cumplimiento diario</h3>
        </div>
        <small>Meta ${meta} pares</small>
      </div>
      <div class="grafica-diaria-layout">
        <div class="grafica-barras">
          ${entradas.map(([proceso, datos]) => `
            <div class="barra-fila">
              <span class="barra-label">${proceso}</span>
              <div class="barra-stack">
                ${generarBarra(`Pares ${datos.pares}/${meta}`, datos.pares, maximo, "barra-primary")}
              </div>
              <span class="barra-dato">${calcularCumplimiento(datos.pares, meta)}%</span>
            </div>
          `).join("")}
        </div>
        ${generarGaugeCumplimiento(cumplimiento, totalOperativo.pares, meta, etiquetaProcesoFinal())}
      </div>
    </section>
  `;
}

function calcularCumplimiento(valor, meta) {
  return meta > 0 ? Math.round((valor / meta) * 100) : 0;
}

function obtenerProcesosOrdenados(procesos) {
  const ordenPlanta = PROCESOS_POR_PLANTA[plantaActual] || [];
  const procesosGuardados = Object.keys(procesos || {});
  const conocidos = ordenPlanta.filter(proceso => procesosGuardados.includes(proceso));
  const extras = procesosGuardados.filter(proceso => !ordenPlanta.includes(proceso)).sort();

  return [...conocidos, ...extras];
}

function obtenerDiasProductivosAcumulados(inicio, fechaCorte) {
  return obtenerFechasRango(inicio, fechaCorte).filter(fecha => {
    const dia = crearFechaLocal(fecha).getDay();
    return dia >= 1 && dia <= DIAS_PRODUCTIVOS;
  }).length;
}

function limitarFechaRango(fecha, inicio, fin) {
  if (fecha < inicio) {
    return inicio;
  }

  if (fecha > fin) {
    return fin;
  }

  return fecha;
}

function generarGraficaSemanal(resumen, fechas, rango) {
  const metaDiaria = obtenerMetaDiaria(plantaActual);
  let paresAcumulados = 0;
  const datosPorDia = fechas.map(fecha => {
    const datos = obtenerTotalOperativo(resumen[fecha] || {});
    const metaAcumulada = metaDiaria * obtenerDiasProductivosAcumulados(rango.inicio, fecha);
    paresAcumulados += datos.pares;

    return {
      fecha,
      datos,
      metaAcumulada,
      paresAcumulados
    };
  });
  const fechaCorte = limitarFechaRango(fechaActual, rango.inicio, rango.fin);
  const metaGauge = metaDiaria * obtenerDiasProductivosAcumulados(rango.inicio, fechaCorte);
  const paresGauge = datosPorDia
    .filter(dia => dia.fecha <= fechaCorte)
    .reduce((total, dia) => total + dia.datos.pares, 0);
  const cumplimiento = calcularCumplimiento(paresGauge, metaGauge);
  const maximo = Math.max(1, ...datosPorDia.flatMap(dia => [dia.paresAcumulados, dia.metaAcumulada]));

  return `
    <section class="resumen-grafica" aria-label="Grafica semanal">
      <div class="grafica-header">
        <div>
          <span class="eyebrow">Vista ejecutiva</span>
          <h3>Cumplimiento semanal</h3>
        </div>
        <small>Meta acumulada al ${formatearFechaCorta(fechaCorte)}: ${metaGauge}</small>
      </div>
      <div class="grafica-semanal-layout">
        <div class="grafica-semana">
          ${datosPorDia.map(dia => `
            <div class="dia-card">
              <span>${formatearFechaCorta(dia.fecha)}</span>
              ${generarBarra(`Pares acum. ${dia.paresAcumulados}/${dia.metaAcumulada}`, dia.paresAcumulados, maximo, "barra-primary")}
              <small>${calcularCumplimiento(dia.paresAcumulados, dia.metaAcumulada)}% cumplimiento</small>
            </div>
          `).join("")}
        </div>
        ${generarGaugeCumplimiento(cumplimiento, paresGauge, metaGauge, `${etiquetaProcesoFinal()} acumulado`)}
      </div>
    </section>
  `;
}

function generarGaugeCumplimiento(cumplimiento, pares, meta, etiqueta) {
  const avanceGauge = Math.min(100, Math.max(0, cumplimiento));
  const detalle = meta > 0 ? `${pares}/${meta} pares` : `${pares} pares`;

  return `
    <div class="gauge-cumplimiento" style="--avance: ${avanceGauge};" aria-label="Cumplimiento de la planta">
      <div class="gauge-arco">
        <div class="gauge-centro">
          <strong>${cumplimiento}%</strong>
          <span>cumplimiento</span>
        </div>
      </div>
      <div class="gauge-datos">
        <span>${detalle}</span>
        <small>${etiqueta}</small>
      </div>
    </div>
  `;
}

function generarBarra(etiqueta, valor, maximo, clase) {
  const ancho = Math.round((valor / maximo) * 100);

  return `
    <div class="barra-linea">
      <span>${etiqueta}</span>
      <div class="barra-track">
        <div class="barra-fill ${clase}" style="width: ${ancho}%"></div>
      </div>
      <strong>${valor}</strong>
    </div>
  `;
}

function encabezadoResumen(etiqueta) {
  return `
    <tr>
      <th>${etiqueta}</th>
      <th>Meta</th>
      <th>Pares</th>
      <th>Afectados</th>
      <th>Calidad</th>
      <th>Defectos</th>
      <th>Inventario</th>
      <th>Entregados</th>
    </tr>
  `;
}

function generarFilaResumen(etiqueta, datos, esTotal = false) {
  return `
    <tr class="${esTotal ? "fila-total-resumen" : ""}">
      <td>${etiqueta}</td>
      <td>${obtenerMetaDiaria(plantaActual)}</td>
      <td>${datos.pares}</td>
      <td>${datos.afectados}</td>
      <td>${formatearCalidad(datos.calidad)}</td>
      <td>${datos.defectos}</td>
      <td>${datos.inventario}</td>
      <td>${datos.entregados}</td>
    </tr>
  `;
}

function sumarProcesos(procesos) {
  return Object.values(procesos || {}).reduce((total, datos) => sumarTotales(total, datos), crearTotalVacio());
}

function obtenerTotalOperativo(procesos) {
  const procesoFinal = PROCESO_FINAL_POR_PLANTA[plantaActual];

  if (procesoFinal) {
    const final = procesos?.[procesoFinal] || crearTotalVacio();
    const acumulado = sumarProcesos(procesos);

    return {
      pares: final.pares,
      afectados: acumulado.afectados,
      calidad: calcularPromedioCalidad(acumulado),
      calidadSuma: acumulado.calidadSuma,
      calidadConteo: acumulado.calidadConteo,
      defectos: acumulado.defectos,
      inventario: acumulado.inventario,
      entregados: final.entregados
    };
  }

  return sumarProcesos(procesos);
}

function sumarSemanaOperativa(resumen) {
  return Object.values(resumen).reduce((totalSemana, procesos) => {
    return sumarTotales(totalSemana, obtenerTotalOperativo(procesos));
  }, crearTotalVacio());
}

function etiquetaTotalOperativo() {
  const procesoFinal = PROCESO_FINAL_POR_PLANTA[plantaActual];
  return procesoFinal ? `Total operativo (${procesoFinal})` : "Total capturado";
}

function etiquetaProcesoFinal() {
  const procesoFinal = PROCESO_FINAL_POR_PLANTA[plantaActual];
  return procesoFinal ? `terminado (${procesoFinal})` : "capturado";
}

function sumarTotales(a, b) {
  return {
    pares: a.pares + b.pares,
    afectados: a.afectados + b.afectados,
    calidadSuma: (a.calidadSuma || 0) + (b.calidadSuma || 0),
    calidadConteo: (a.calidadConteo || 0) + (b.calidadConteo || 0),
    calidad: calcularPromedioCalidad({
      calidadSuma: (a.calidadSuma || 0) + (b.calidadSuma || 0),
      calidadConteo: (a.calidadConteo || 0) + (b.calidadConteo || 0)
    }),
    defectos: a.defectos + b.defectos,
    inventario: a.inventario + b.inventario,
    entregados: a.entregados + b.entregados
  };
}

function crearTotalVacio() {
  return {
    pares: 0,
    afectados: 0,
    calidad: 0,
    calidadSuma: 0,
    calidadConteo: 0,
    defectos: 0,
    inventario: 0,
    entregados: 0
  };
}

function calcularPromedioCalidad(datos) {
  if (!datos.calidadConteo) {
    return 0;
  }

  return datos.calidadSuma / datos.calidadConteo;
}

function formatearCalidad(valor) {
  if (!valor) {
    return "0";
  }

  return Number.isInteger(valor) ? valor : valor.toFixed(1);
}

function obtenerRangoSemana(fecha) {
  const [year, month, day] = fecha.split("-").map(Number);
  const base = new Date(year, month - 1, day);
  const diaSemana = base.getDay() || 7;
  const inicio = new Date(base);
  const fin = new Date(base);

  inicio.setDate(base.getDate() - diaSemana + 1);
  fin.setDate(inicio.getDate() + DIAS_PRODUCTIVOS - 1);

  return {
    inicio: fechaISO(inicio),
    fin: fechaISO(fin)
  };
}

function obtenerFechasRango(inicio, fin) {
  const fechas = [];
  const actual = crearFechaLocal(inicio);
  const limite = crearFechaLocal(fin);

  while (actual <= limite) {
    fechas.push(fechaISO(actual));
    actual.setDate(actual.getDate() + 1);
  }

  return fechas;
}

function crearFechaLocal(fecha) {
  const [year, month, day] = fecha.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function fechaISO(fecha) {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatearFechaCorta(fecha) {
  const [year, month, day] = fecha.split("-");
  return `${day}/${month}/${year.slice(2)}`;
}

function abrirModalResumen(titulo, subtitulo, contenido) {
  const modal = document.getElementById("modalResumen");

  document.getElementById("modalTitulo").textContent = titulo;
  document.getElementById("modalEyebrow").textContent = subtitulo;
  document.getElementById("modalContenido").innerHTML = `<p class="mensaje-resumen">${contenido}</p>`;
  modal.showModal();
}

function cerrarModalResumen() {
  document.getElementById("modalResumen").close();
}

function mostrarErrorResumen(mensaje) {
  document.getElementById("modalContenido").innerHTML = `<p class="mensaje-resumen">${mensaje}</p>`;
}

function ajustarAlturaTexto(campo) {
  if (campo.tagName !== "TEXTAREA") {
    return;
  }

  campo.closest(".celda-texto")?.classList.toggle("tiene-texto", campo.value.trim().length > 0);
  campo.style.height = "auto";
  campo.style.height = `${campo.scrollHeight}px`;
}

function limpiarTabla() {
  desconectarTableroTiempoReal();
  actualizarVisibilidadTotalGeneral();
  document.getElementById("tabla").innerHTML = `
    <tr>
      <td colspan="15" class="mensaje">
        Selecciona planta, proceso y fecha para iniciar la captura.
      </td>
    </tr>
  `;

  [
    "total-pares",
    "total-afectadosIng",
    "total-calidad",
    "total-defectos",
    "total-afectadosMtto",
    "total-afectadosCompras",
    "total-afectadosDesarrollo",
    "total-inventario",
    "total-entregados"
  ].forEach(id => {
    document.getElementById(id).textContent = "0";
  });

  document.getElementById("resumenKpis").innerHTML = generarKpisProcesoIndividual("");
  document.getElementById("resumenKpis").classList.remove("summary-grid-procesos");
}

function reiniciarTablero() {
  document.getElementById("selectPlanta").value = "";
  document.getElementById("selectFecha").valueAsDate = new Date();
  actualizarProcesos();
  validarSeleccion();
}

function actualizarEstado(listo, texto) {
  const estado = document.getElementById("estadoTablero");
  estado.textContent = texto || (listo ? "Listo para captura" : "Pendiente de seleccion");
  estado.classList.toggle("ready", listo);
}
