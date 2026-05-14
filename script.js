// ==================== CONFIGURACIÓN ====================
const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const HORA_INICIO = 7;
const HORA_FIN = 23;
const PIXELS_POR_HORA = 50;

const horasBase = [];
for (let h = HORA_INICIO; h < HORA_FIN; h++) {
    horasBase.push(`${h.toString().padStart(2, '0')}:00`);
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

// ==================== FECHAS ====================
function getFechasSemana() {
    const hoy = new Date();
    const diaSemanaHoy = hoy.getDay(); // 0=Dom, 1=Lun...
    const offsetLunes = diaSemanaHoy === 0 ? -6 : 1 - diaSemanaHoy;
    
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + offsetLunes);
    
    const fechas = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(lunes);
        d.setDate(lunes.getDate() + i);
        fechas.push(d);
    }
    return fechas;
}

function formatFecha(date) {
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

function esPasado(date) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d < hoy;
}

function esHoy(date) {
    const hoy = new Date();
    return formatFecha(date) === formatFecha(hoy);
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

// ==================== CALENDARIO ====================
function renderizarCalendario() {
    const container = document.getElementById('weeklySchedule');
    if (!container) return;
    
    const fechasSemana = getFechasSemana();
    
    let html = '<div class="week-grid">';
    
    diasSemana.forEach((dia, index) => {
        const fechaObj = fechasSemana[index];
        const hoy = esHoy(fechaObj);
        const pasado = esPasado(fechaObj);
        
        let claseHeader = '';
        if (hoy) claseHeader = 'today';
        else if (pasado) claseHeader = 'past';
        
        const reservas = obtenerReservasUnicas(dia);
        
        html += `
            <div class="day-column">
                <div class="day-header ${claseHeader}">
                    ${dia}
                    <span class="date">${formatFecha(fechaObj)}</span>
                </div>
                <div class="time-slots">
        `;
        
        if (reservas.length === 0) {
            html += `
                <div class="time-slot free" onclick="openActivityModal('${dia}', '${HORA_INICIO.toString().padStart(2,'0')}:00', ${pasado})" 
                     style="height: 100%; min-height: 200px; cursor: pointer;">
                    <span class="slot-time">${HORA_INICIO}:00 - ${HORA_FIN}:00</span>
                    <span class="slot-label">Libre (click para añadir)</span>
                </div>
            `;
        } else {
            const bloquesCronologicos = generarListaCronologica(reservas);
            
            bloquesCronologicos.forEach(bloque => {
                const alturaPx = calcularAlturaEnPx(bloque.horaInicio, bloque.horaFin);
                
                if (bloque.tipo === 'free') {
                    html += `
                        <div class="time-slot free" onclick="openActivityModal('${dia}', '${bloque.horaInicio}', ${pasado})" 
                             style="height: ${alturaPx}px; cursor: pointer;">
                            <span class="slot-time">${bloque.horaInicio} - ${bloque.horaFin}</span>
                            <span class="slot-label">Libre</span>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="time-slot occupied" onclick="openActivityModal('${dia}', '${bloque.horaInicio}', ${pasado})" 
                             style="height: ${alturaPx}px;">
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
    
    Object.keys(estado.horarios).forEach(key => {
        const partes = key.split('_');
        if (parseInt(partes[0]) === estado.pistaActiva && partes[1] === dia) {
            const reserva = estado.horarios[key];
            if (!reservasMap.has(reserva.horaInicio)) {
                reservasMap.set(reserva.horaInicio, {
                    horaInicio: reserva.horaInicio,
                    horaFin: reserva.horaFin,
                    tipo: reserva.tipo,
                    desc: reserva.desc
                });
            }
        }
    });
    
    const reservas = Array.from(reservasMap.values());
    reservas.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    return reservas;
}

function generarListaCronologica(reservas) {
    const listaCompleta = [];
    let horaActual = `${HORA_INICIO.toString().padStart(2, '0')}:00`;
    const horaFinDia = `${HORA_FIN.toString().padStart(2, '0')}:00`;
    
    reservas.forEach(reserva => {
        if (reserva.horaInicio > horaActual) {
            listaCompleta.push({ tipo: 'free', horaInicio: horaActual, horaFin: reserva.horaInicio });
        }
        listaCompleta.push({ tipo: reserva.tipo, desc: reserva.desc, horaInicio: reserva.horaInicio, horaFin: reserva.horaFin });
        horaActual = reserva.horaFin;
    });
    
    if (horaActual < horaFinDia) {
        listaCompleta.push({ tipo: 'free', horaInicio: horaActual, horaFin: horaFinDia });
    }
    
    return listaCompleta;
}

function calcularAlturaEnPx(horaInicio, horaFin) {
    const [h1, m1] = horaInicio.split(':').map(Number);
    const [h2, m2] = horaFin.split(':').map(Number);
    const duracionHoras = (h2 + m2 / 60) - (h1 + m1 / 60);
    return Math.max(duracionHoras * PIXELS_POR_HORA, 35);
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

function openActivityModal(dia, hora, esDiaPasado) {
    if (esDiaPasado) {
        openPastDayModal();
        return;
    }

    estado.currentSlot = { dia, hora };
    hideError('activityModal');

    document.getElementById('activityDay').value = dia;
    document.getElementById('activityTimeStart').value = hora;
    
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

// Modal días pasados
function openPastDayModal() {
    document.getElementById('pastDayModal').classList.add('active');
}

function closePastDayModal() {
    document.getElementById('pastDayModal').classList.remove('active');
}

// Modal confirmar limpiar
function openClearConfirmModal() {
    document.getElementById('clearConfirmModal').classList.add('active');
}

function closeClearConfirmModal() {
    document.getElementById('clearConfirmModal').classList.remove('active');
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
    
    const key = `${estado.pistaActiva}_${estado.currentSlot.dia}_${horaInicio}`;
    estado.horarios[key] = { tipo, desc, horaInicio, horaFin };
    
    guardarEstado();
    renderizarCalendario();
    closeActivityModal();
}

function clearSlot() {
    closeActivityModal();
    openClearConfirmModal();
}

function confirmClearSlot() {
    Object.keys(estado.horarios).forEach(key => {
        const partes = key.split('_');
        const pistaId = parseInt(partes[0]);
        const dia = partes[1];
        const hora = partes[2];
        if (pistaId === estado.pistaActiva && 
            dia === estado.currentSlot.dia && 
            hora === estado.currentSlot.hora) {
            delete estado.horarios[key];
        }
    });
    
    guardarEstado();
    renderizarCalendario();
    closeClearConfirmModal();
    estado.currentSlot = null;
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
        closePastDayModal();
        closeClearConfirmModal();
    }
});