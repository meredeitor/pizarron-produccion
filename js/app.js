import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  doc,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

let plantaActual = null;
let procesoActual = null;
let fechaActual = null;
let tableroRefActual = null;
let detenerEscuchaTablero = null;
let guardadoTimer = null;
let aplicandoCambiosRemotos = false;

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
  { id: "calidad", tipo: "number", clase: "calidad", label: "Indicador de calidad" },
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

document.addEventListener("DOMContentLoaded", () => {
  actualizarMeta();
  document.getElementById("selectFecha").valueAsDate = new Date();

  document.getElementById("selectPlanta").addEventListener("change", () => {
    actualizarProcesos();
    validarSeleccion();
  });
  document.getElementById("selectProceso").addEventListener("change", validarSeleccion);
  document.getElementById("selectFecha").addEventListener("change", validarSeleccion);
  document.getElementById("btnLimpiar").addEventListener("click", reiniciarTablero);
  document.getElementById("btnImprimir").addEventListener("click", () => window.print());

  actualizarProcesos();
  validarSeleccion();
});

function validarSeleccion() {
  const planta = document.getElementById("selectPlanta").value;
  const proceso = document.getElementById("selectProceso").value;
  const fecha = document.getElementById("selectFecha").value;

  document.getElementById("tituloProceso").textContent = proceso || "Selecciona proceso";
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
  const metasPorHora = obtenerMetasPorHora(plantaActual);
  const horaComida = obtenerHoraComida(plantaActual, procesoActual);
  let horaProductiva = 0;

  tabla.innerHTML = "";

  HORAS_JORNADA.forEach(hora => {
    if (hora === horaComida) {
      tabla.innerHTML += `
        <tr class="fila-comida">
          <td>-</td>
          <td>${hora}</td>
          <td colspan="13">TIEMPO DE COMIDA</td>
        </tr>
      `;
      return;
    }

    tabla.innerHTML += `
      <tr>
        <td>${metasPorHora[horaProductiva]} PARES</td>
        <td>${hora}</td>
        ${generarInputs(hora)}
      </tr>
    `;
    horaProductiva += 1;
  });

  activarEventosCaptura();
  calcularTotales();
  conectarTableroTiempoReal();
}

function generarInputs(hora) {
  return CAMPOS_CAPTURA.map(campo => {
    const clase = campo.clase ? ` class="${campo.clase}"` : "";
    const min = campo.tipo === "number" ? ' min="0"' : "";

    return `
      <td>
        <input
          type="${campo.tipo}"
          ${min}
          ${clase}
          data-hora="${hora}"
          data-campo="${campo.id}"
          aria-label="${campo.label}">
      </td>
    `;
  }).join("");
}

function activarEventosCaptura() {
  const inputs = document.querySelectorAll("#tabla input");

  inputs.forEach(input => {
    input.addEventListener("input", calcularTotales);
    input.addEventListener("input", programarGuardadoTablero);
  });
}

function calcularTotales() {
  const pares = calcularColumna("pares", "total-pares");
  const afectadosIng = calcularColumna("afectadosIng", "total-afectadosIng");
  const calidad = calcularColumna("calidad", "total-calidad");
  const defectos = calcularColumna("defectos", "total-defectos");
  const afectadosMtto = calcularColumna("afectadosMtto", "total-afectadosMtto");
  const afectadosCompras = calcularColumna("afectadosCompras", "total-afectadosCompras");
  const afectadosDesarrollo = calcularColumna("afectadosDesarrollo", "total-afectadosDesarrollo");
  const inventario = calcularColumna("inventario", "total-inventario");
  const entregados = calcularColumna("entregados", "total-entregados");

  document.getElementById("kpi-pares").textContent = pares;
  document.getElementById("kpi-afectados").textContent =
    afectadosIng + afectadosMtto + afectadosCompras + afectadosDesarrollo + defectos;
  document.getElementById("kpi-entregados").textContent = entregados;
}

function calcularColumna(clase, idTotal) {
  let suma = 0;
  const inputs = document.querySelectorAll(`.${clase}`);

  inputs.forEach(input => {
    suma += parseInt(input.value, 10) || 0;
  });

  const celda = document.getElementById(idTotal);

  if (celda) {
    celda.textContent = suma;
  }

  return suma;
}

function actualizarProcesos() {
  const planta = document.getElementById("selectPlanta").value;
  const selectProceso = document.getElementById("selectProceso");
  const procesos = PROCESOS_POR_PLANTA[planta] || [];

  selectProceso.innerHTML = "";
  selectProceso.appendChild(crearOpcion("", procesos.length ? "Selecciona proceso" : "Selecciona planta primero"));
  selectProceso.disabled = procesos.length === 0;

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

function obtenerMetasPorHora(planta) {
  const metaDiaria = obtenerMetaDiaria(planta);
  const base = Math.floor(metaDiaria / HORAS_PRODUCTIVAS);
  const sobrante = metaDiaria % HORAS_PRODUCTIVAS;

  return Array.from({ length: HORAS_PRODUCTIVAS }, (_, index) => {
    return base + (index < sobrante ? 1 : 0);
  });
}

function actualizarMeta() {
  document.getElementById("kpi-meta").textContent = obtenerMetaDiaria(plantaActual);
}

function conectarTableroTiempoReal() {
  desconectarTableroTiempoReal();

  tableroRefActual = doc(db, "tableros-produccion", crearIdTablero());
  actualizarEstado(true, "Conectando...");

  detenerEscuchaTablero = onSnapshot(tableroRefActual, snapshot => {
    aplicarDatosRemotos(snapshot.exists() ? snapshot.data() : {});
    actualizarEstado(true, "En tiempo real");
  }, error => {
    console.error("Error al escuchar Firebase:", error);
    actualizarEstado(false, "Sin conexion a Firebase");
  });
}

function desconectarTableroTiempoReal() {
  if (detenerEscuchaTablero) {
    detenerEscuchaTablero();
    detenerEscuchaTablero = null;
  }

  tableroRefActual = null;
  clearTimeout(guardadoTimer);
}

function crearIdTablero() {
  return `${fechaActual}__P${plantaActual}__${encodeURIComponent(procesoActual)}`;
}

function programarGuardadoTablero() {
  if (!tableroRefActual || aplicandoCambiosRemotos) {
    return;
  }

  actualizarEstado(true, "Guardando...");
  clearTimeout(guardadoTimer);
  guardadoTimer = setTimeout(guardarTablero, 350);
}

async function guardarTablero() {
  if (!tableroRefActual) {
    return;
  }

  try {
    await setDoc(tableroRefActual, obtenerDatosTablero(), { merge: true });
    actualizarEstado(true, "Guardado");
  } catch (error) {
    console.error("Error al guardar Firebase:", error);
    actualizarEstado(false, "Error al guardar");
  }
}

function obtenerDatosTablero() {
  const filas = {};

  document.querySelectorAll("#tabla input").forEach(input => {
    const hora = input.dataset.hora;
    const campo = input.dataset.campo;

    if (!filas[hora]) {
      filas[hora] = {};
    }

    filas[hora][campo] = input.value;
  });

  return {
    fecha: fechaActual,
    planta: plantaActual,
    proceso: procesoActual,
    filas,
    actualizadoEn: serverTimestamp()
  };
}

function aplicarDatosRemotos(datos) {
  const filas = datos.filas || {};

  aplicandoCambiosRemotos = true;

  document.querySelectorAll("#tabla input").forEach(input => {
    const valorRemoto = filas[input.dataset.hora]?.[input.dataset.campo];

    if (valorRemoto === undefined || document.activeElement === input) {
      return;
    }

    input.value = valorRemoto;
  });

  aplicandoCambiosRemotos = false;
  calcularTotales();
}

function limpiarTabla() {
  desconectarTableroTiempoReal();
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
    "total-entregados",
    "kpi-pares",
    "kpi-afectados",
    "kpi-entregados"
  ].forEach(id => {
    document.getElementById(id).textContent = "0";
  });
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
