// ==================== CONFIGURACIÓN ====================
const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const HORA_INICIO = 7;
const HORA_FIN = 23;
const ALTURA_DIA = 500;

// Generar array de horas
const horas = [];
for (let h = HORA_INICIO; h < HORA_FIN; h++) {
    horas.push(`${h.toString().padStart(2, '0')}:00`);
}

let estado = {
    pistas: [{ id: 1, nombre: 'Pista 1' }],
    pistaActiva: 1,
    horarios: {},
    courtToDelete: null,
    currentSlot: null
};

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
    cargarEstado();
    if (document.getElementById('tabsList')) {
        renderizarTabs();
        renderizarCalendario();
    }
});

function cargarEstado() {
    const guardado = localStorage.getItem('korva_pistas');
    if (guardado) {
        estado = { ...estado, ...JSON.parse(guardado) };
    }
}

function guardarEstado() {
    localStorage.setItem('korva_pistas', JSON.stringify(estado));
}

function getFechaHoy() {
    const hoy = new Date();
    return `${hoy.getDate().toString().padStart(2, '0')}/${(hoy.getMonth() + 1).toString().padStart(2, '0')}`;
}

function getDiaSemanaIndex() {
    const dia = new Date().getDay();
    return dia === 0 ? 6 : dia - 1;
}

// ==================== TABS ====================
function renderizarTabs() {
    const tabsList = document.getElementById('tabsList');
    tabsList.innerHTML = '';
    
    estado.pistas.forEach(pista => {
        const tab = document.createElement('div');
        tab.className = `tab ${pista.id === estado.pistaActiva ? 'active' : ''}`;
        tab.innerHTML = `
            <span onclick="activarPista(${pista.id})">${pista.nombre}</span>
            <span class="tab-delete" onclick="openDeleteModal(${pista.id})">×</span>
        `;
        tabsList.appendChild(tab);
    });
}

function activarPista(id) {
    estado.pistaActiva = id;
    guardarEstado();
    renderizarTabs();
    renderizarCalendario();
}

// ==================== CALENDARIO CORREGIDO ====================
function renderizarCalendario() {
    const container = document.getElementById('weeklySchedule');
    if (!container) return;
    
    const diaHoyIndex = getDiaSemanaIndex();
    const fechaHoy = getFechaHoy();
    
    let html = '<div class="week-grid">';
    
    diasSemana.forEach((dia, index) => {
        const esHoy = index === diaHoyIndex;
        const claseHoy = esHoy ? 'today' : '';
        const fechaMostrar = esHoy ? fechaHoy : '';
        
        // Obtener reservas únicas y ordenadas
        const reservas = obtenerReservasUnicas(dia);
        
        html += `
            <div class="day-column">
                <div class="day-header ${claseHoy}">
                    ${dia}
                    ${fechaMostrar ? `<span class="date">${fechaMostrar}</span>` : ''}
                </div>
                <div class="time-slots">
        `;
        
        if (reservas.length === 0) {
            // Día completamente libre
            html += `
                <div class="time-slot free" style="top: 0; height: 100%; position: relative;">
                    <span class="slot-time">${HORA_INICIO}:00 - ${HORA_FIN}:00</span>
                    <span style="color: #cbd5e1; font-size: 0.7rem;">Libre</span>
                </div>
            `;
        } else {
            // Generar bloques con huecos
            const bloques = generarBloquesConHuecos(reservas);
            
            bloques.forEach(bloque => {
                const top = calcularPosicionTop(bloque.horaInicio);
                const height = calcularAlturaBloque(bloque.horaInicio, bloque.horaFin);
                
                if (bloque.tipo === 'free') {
                    html += `
                        <div class="time-slot free" style="top: ${top}px; height: ${height}px;">
                            <span class="slot-time">${bloque.horaInicio} - ${bloque.horaFin}</span>
                            <span style="color: #cbd5e1; font-size: 0.7rem;">Libre</span>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="time-slot occupied" onclick="openActivityModal('${dia}', '${bloque.horaInicio}')" 
                             style="top: ${top}px; height: ${height}px;">
                            <span class="slot-time">${bloque.horaInicio} - ${bloque.horaFin}</span>
                            <span class="slot-type">${bloque.tipo}</span>
                            <span class="slot-desc">${bloque.desc}</span>
                        </div>
                    `;
                }
            });
        }
        
        html += '</div></div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function obtenerReservasUnicas(dia) {
    const reservasMap = new Map();
    
    // Recorrer todas las horas posibles
    for (let h = HORA_INICIO; h < HORA_FIN; h++) {
        const horaKey = `${h.toString().padStart(2, '0')}:00`;
        const storageKey = `${estado.pistaActiva}_${dia}_${horaKey}`;
        
        if (estado.horarios[storageKey]) {
            const reserva = estado.horarios[storageKey];
            // Usar horaInicio como clave única para evitar duplicados
            if (!reservasMap.has(reserva.horaInicio)) {
                reservasMap.set(reserva.horaInicio, {
                    horaInicio: reserva.horaInicio,
                    horaFin: reserva.horaFin,
                    tipo: reserva.tipo,
                    desc: reserva.desc
                });
            }
        }
    }
    
    // Convertir a array y ordenar
    const reservas = Array.from(reservasMap.values());
    reservas.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    
    return reservas;
}

function generarBloquesConHuecos(reservas) {
    const bloques = [];
    let horaActual = `${HORA_INICIO.toString().padStart(2, '0')}:00`;
    
    reservas.forEach(reserva => {
        // Si hay hueco antes de esta reserva
        if (reserva.horaInicio > horaActual) {
            bloques.push({
                tipo: 'free',
                horaInicio: horaActual,
                horaFin: reserva.horaInicio
            });
        }
        
        // Añadir la reserva
        bloques.push({
            tipo: reserva.tipo,
            desc: reserva.desc,
            horaInicio: reserva.horaInicio,
            horaFin: reserva.horaFin
        });
        
        // Actualizar hora actual
        horaActual = reserva.horaFin;
    });
    
    // Hueco final si queda tiempo
    const horaFinDia = `${HORA_FIN.toString().padStart(2, '0')}:00`;
    if (horaActual < horaFinDia) {
        bloques.push({
            tipo: 'free',
            horaInicio: horaActual,
            horaFin: horaFinDia
        });
    }
    
    return bloques;
}

function calcularPosicionTop(hora) {
    const [h, m] = hora.split(':').map(Number);
    const minutosDesdeInicio = (h - HORA_INICIO) * 60 + m;
    const minutosTotales = (HORA_FIN - HORA_INICIO) * 60;
    return (minutosDesdeInicio / minutosTotales) * ALTURA_DIA;
}

function calcularAlturaBloque(horaInicio, horaFin) {
    const [h1, m1] = horaInicio.split(':').map(Number);
    const [h2, m2] = horaFin.split(':').map(Number);
    
    const minutosInicio = (h1 - HORA_INICIO) * 60 + m1;
    const minutosFin = (h2 - HORA_INICIO) * 60 + m2;
    const duracionMinutos = minutosFin - minutosInicio;
    
    const minutosTotales = (HORA_FIN - HORA_INICIO) * 60;
    return (duracionMinutos / minutosTotales) * ALTURA_DIA;
}

// ==================== MODALES ====================
function openAddCourtModal() {
    document.getElementById('addCourtModal').classList.add('active');
    document.getElementById('courtName').focus();
}

function closeAddCourtModal() {
    document.getElementById('addCourtModal').classList.remove('active');
    document.getElementById('courtName').value = '';
}

function createCourt() {
    const nombre = document.getElementById('courtName').value.trim();
    if (!nombre) {
        showError('addCourtModal', 'El nombre es obligatorio');
        return;
    }
    
    const nuevoId = Math.max(...estado.pistas.map(p => p.id), 0) + 1;
    estado.pistas.push({ id: nuevoId, nombre });
    estado.pistaActiva = nuevoId;
    
    guardarEstado();
    renderizarTabs();
    renderizarCalendario();
    closeAddCourtModal();
}

function openActivityModal(dia, hora) {
    estado.currentSlot = { dia, hora };
    hideError('activityModal');

    document.getElementById('activityDay').value = dia;
    document.getElementById('activityTimeStart').value = hora;
    
    // Buscar la reserva existente para obtener horaFin real
    const key = `${estado.pistaActiva}_${dia}_${hora}`;
    const actividad = estado.horarios[key];
    
    if (actividad) {
        document.getElementById('activityTimeStart').value = actividad.horaInicio;
        document.getElementById('activityTimeEnd').value = actividad.horaFin;
        document.getElementById('activityType').value = actividad.tipo;
        document.getElementById('activityDesc').value = actividad.desc;
    } else {
        const horaNum = parseInt(hora.split(':')[0]);
        const horaFin = `${(horaNum + 1).toString().padStart(2, '0')}:00`;
        document.getElementById('activityTimeEnd').value = horaFin;
        document.getElementById('activityType').value = 'Partido';
        document.getElementById('activityDesc').value = '';
    }
    
    document.getElementById('activityModal').classList.add('active');
}

function closeActivityModal() {
    document.getElementById('activityModal').classList.remove('active');
    estado.currentSlot = null;
    hideError('activityModal');
}

function showError(modalId, msg) {
    const modal = document.getElementById(modalId);
    let errorEl = modal.querySelector('.error-message');
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.className = 'error-message';
        modal.querySelector('.modal-body').prepend(errorEl);
    }
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
}

function hideError(modalId) {
    const modal = document.getElementById(modalId);
    const errorEl = modal.querySelector('.error-message');
    if (errorEl) errorEl.style.display = 'none';
}

function saveActivity() {
    const horaInicio = document.getElementById('activityTimeStart').value;
    const horaFin = document.getElementById('activityTimeEnd').value;
    const tipo = document.getElementById('activityType').value;
    const desc = document.getElementById('activityDesc').value.trim();
    
    hideError('activityModal');

    if (!horaInicio || !horaFin) {
        showError('activityModal', 'Selecciona horas válidas');
        return;
    }
    
    if (!desc) {
        showError('activityModal', 'Introduce una descripción');
        return;
    }
    
    if (horaInicio >= horaFin) {
        showError('activityModal', 'La hora de fin debe ser posterior');
        return;
    }
    
    // Guardar usando horaInicio como clave
    const key = `${estado.pistaActiva}_${estado.currentSlot.dia}_${horaInicio}`;
    estado.horarios[key] = { 
        tipo, 
        desc, 
        horaInicio, 
        horaFin 
    };
    
    guardarEstado();
    renderizarCalendario();
    closeActivityModal();
}

function clearSlot() {
    if (confirm('¿Estás seguro de que quieres eliminar esta actividad?')) {
        // Buscar y eliminar todas las claves que coincidan
        Object.keys(estado.horarios).forEach(key => {
            const [pistaId, dia, hora] = key.split('_');
            if (parseInt(pistaId) === estado.pistaActiva && 
                dia === estado.currentSlot.dia && 
                hora === estado.currentSlot.hora) {
                delete estado.horarios[key];
            }
        });
        
        guardarEstado();
        renderizarCalendario();
        closeActivityModal();
    }
}

function openDeleteModal(pistaId) {
    estado.courtToDelete = pistaId;
    const pista = estado.pistas.find(p => p.id === pistaId);
    document.getElementById('deleteCourtName').textContent = pista.nombre;
    document.getElementById('deleteModal').classList.add('active');
}

function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    estado.courtToDelete = null;
}

function confirmDeleteCourt() {
    if (!estado.courtToDelete) return;
    
    estado.pistas = estado.pistas.filter(p => p.id !== estado.courtToDelete);
    
    if (estado.pistaActiva === estado.courtToDelete) {
        estado.pistaActiva = estado.pistas.length > 0 ? estado.pistas[0].id : null;
    }
    
    Object.keys(estado.horarios).forEach(key => {
        if (key.startsWith(`${estado.courtToDelete}_`)) {
            delete estado.horarios[key];
        }
    });
    
    guardarEstado();
    renderizarTabs();
    renderizarCalendario();
    closeDeleteModal();
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAddCourtModal();
        closeActivityModal();
        closeDeleteModal();
    }
});