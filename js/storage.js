function guardarDatos(data) {
  localStorage.setItem("tablero", JSON.stringify(data))
}

function obtenerDatos() {
  return JSON.parse(localStorage.getItem("tablero")) || []
}