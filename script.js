// ==================== DATOS ====================
const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const horas = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
    '19:00', '20:00', '21:00', '22:00', '23:00'
];

// Estado de la aplicación
let estado = {
    pistas: [
        { id: 1, nombre: 'Pista 1' }
    ],
    pistaActiva: 1,
    horarios: {}, // Formato: { "pistaId_dia_hora": { tipo: '', desc: '' } }
    courtToDelete: null,
    currentSlot: null
};

// ==================== INICIALIZACIÓN ====================
document.addEventListener('DOMContentLoaded', () => {
    cargarEstado();
    
    // Si estamos en la página de pistas
    if (document.getElementById('tabsList')) {
        renderizarTabs();
        renderizarCalendario();
    }
});

// Cargar desde localStorage
function cargarEstado() {
    const guardado = localStorage.getItem('korva_pistas');
    if (guardado) {
        const datos = JSON.parse(guardado);
        estado = { ...estado, ...datos };
    }
}

// Guardar en localStorage
function guardarEstado() {
    localStorage.setItem('korva_pistas', JSON.stringify(estado));
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
            <span class="tab-delete" onclick="openDeleteModal(${pista.id})" title="Eliminar">×</span>
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
    
    let html = '<div class="week-grid">';
    
    diasSemana.forEach(dia => {
        html += `
            <div class="day-column">
                <div class="day-header">${dia}</div>
                <div class="time-slots">
        `;
        
        horas.forEach(hora => {
            const key = `${estado.pistaActiva}_${dia}_${hora}`;
            const actividad = estado.horarios[key];
            const contenido = actividad ? `${actividad.tipo}: ${actividad.desc}` : 'Libre';
            const claseOcupado = actividad ? 'occupied' : '';
            
            html += `
                <div class="time-slot ${claseOcupado}" onclick="openActivityModal('${dia}', '${hora}')">
                    ${contenido}
                </div>
            `;
        });
        
        html += '</div></div>';
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ==================== MODAL AÑADIR PISTA ====================
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
        alert('Introduce un nombre para la pista');
        return;
    }
    
    const nuevoId = Math.max(...estado.pistas.map(p => p.id), 0) + 1;
    estado.pistas.push({ id: nuevoId, nombre: nombre });
    estado.pistaActiva = nuevoId;
    
    guardarEstado();
    renderizarTabs();
    renderizarCalendario();
    closeAddCourtModal();
}

// ==================== MODAL ACTIVIDAD ====================
function openActivityModal(dia, hora) {
    estado.currentSlot = { dia, hora };
    
    document.getElementById('activityDateTime').textContent = `${dia} a las ${hora}`;
    
    const key = `${estado.pistaActiva}_${dia}_${hora}`;
    const actividad = estado.horarios[key];
    
    if (actividad) {
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
    const tipo = document.getElementById('activityType').value;
    const desc = document.getElementById('activityDesc').value.trim();
    
    if (!desc) {
        alert('Introduce una descripción');
        return;
    }
    
    const key = `${estado.pistaActiva}_${estado.currentSlot.dia}_${estado.currentSlot.hora}`;
    estado.horarios[key] = { tipo, desc };
    
    guardarEstado();
    renderizarCalendario();
    closeActivityModal();
}

// ==================== MODAL ELIMINAR ====================
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
    
    // Eliminar pista
    estado.pistas = estado.pistas.filter(p => p.id !== estado.courtToDelete);
    
    // Si era la activa, activar la primera disponible
    if (estado.pistaActiva === estado.courtToDelete) {
        estado.pistaActiva = estado.pistas.length > 0 ? estado.pistas[0].id : null;
    }
    
    // Limpiar horarios de esa pista
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

// Cerrar modales con ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeAddCourtModal();
        closeActivityModal();
        closeDeleteModal();
    }
});