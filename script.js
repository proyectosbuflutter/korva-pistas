// ==================== DATOS ====================
const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const horas = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
    '19:00', '20:00', '21:00', '22:00', '23:00'
];

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

// ==================== CALENDARIO ====================
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
        const diaBloqueado = estaDiaBloqueado(dia);
        
        html += `
            <div class="day-column ${diaBloqueado ? 'blocked' : ''}">
                <div class="day-header ${claseHoy}">
                    ${dia}
                    ${fechaMostrar ? `<span class="date">${fechaMostrar}</span>` : ''}
                </div>
                <div class="time-slots">
        `;
        
        horas.forEach(hora => {
            const key = `${estado.pistaActiva}_${dia}_${hora}`;
            const actividad = estado.horarios[key];
            
            if (actividad) {
                html += `
                    <div class="time-slot occupied" onclick="openActivityModal('${dia}', '${hora}')">
                        <span class="slot-time">${actividad.horaInicio} - ${actividad.horaFin}</span>
                        <span class="slot-type">${actividad.tipo}</span>
                        <span class="slot-desc">${actividad.desc}</span>
                    </div>
                `;
            } else {
                html += `
                    <div class="time-slot ${diaBloqueado ? 'blocked' : ''}" 
                         onclick="${diaBloqueado ? '' : `openActivityModal('${dia}', '${hora}')`}">
                        <span class="slot-time">${hora}</span>
                        <span style="color: #cbd5e1; font-size: 0.7rem;">${diaBloqueado ? '---' : 'Libre'}</span>
                    </div>
                `;
            }
        });
        
        html += '</div></div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Verificar si un día está completo (todas las horas ocupadas)
function estaDiaBloqueado(dia) {
    const horasOcupadas = horas.filter(hora => {
        const key = `${estado.pistaActiva}_${dia}_${hora}`;
        return estado.horarios[key];
    });
    return horasOcupadas.length === horas.length;
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
        alert('Introduce un nombre');
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
    if (estaDiaBloqueado(dia)) return;
    
    estado.currentSlot = { dia, hora };
    
    document.getElementById('activityDay').value = dia;
    document.getElementById('activityTimeStart').value = hora;
    
    // Calcular hora fin (1 hora después por defecto)
    const horaNum = parseInt(hora);
    const horaFin = `${(horaNum + 1).toString().padStart(2, '0')}:00`;
    document.getElementById('activityTimeEnd').value = horaFin;
    
    const key = `${estado.pistaActiva}_${dia}_${hora}`;
    const actividad = estado.horarios[key];
    
    if (actividad) {
        document.getElementById('activityTimeStart').value = actividad.horaInicio;
        document.getElementById('activityTimeEnd').value = actividad.horaFin;
        document.getElementById('activityType').value = actividad.tipo;
        document.getElementById('activityDesc').value = actividad.desc;
    } else {
        document.getElementById('activityType').value = 'Partido';
        document.getElementById('activityDesc').value = '';
    }
    
    document.getElementById('activityModal').classList.add('active');
}

function closeActivityModal() {
    document.getElementById('activityModal').classList.remove('active');
    estado.currentSlot = null;
}

function saveActivity() {
    const horaInicio = document.getElementById('activityTimeStart').value;
    const horaFin = document.getElementById('activityTimeEnd').value;
    const tipo = document.getElementById('activityType').value;
    const desc = document.getElementById('activityDesc').value.trim();
    
    if (!horaInicio || !horaFin) {
        alert('Selecciona horas válidas');
        return;
    }
    
    if (!desc) {
        alert('Introduce una descripción');
        return;
    }
    
    if (horaInicio >= horaFin) {
        alert('La hora de fin debe ser posterior a la de inicio');
        return;
    }
    
    // Guardar en la hora de inicio
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
    const key = `${estado.pistaActiva}_${estado.currentSlot.dia}_${estado.currentSlot.hora}`;
    delete estado.horarios[key];
    
    guardarEstado();
    renderizarCalendario();
    closeActivityModal();
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