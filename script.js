// Configuración inicial
const config = {
    horaInicio: 7,
    horaFin: 24,
    intervalo: 60, // minutos
    pistas: ['Pista 1', 'Pista 2', 'Pista 3'] // Editar aquí para añadir/quitar pistas
};

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Estado de la aplicación
let estado = {
    horarios: {}
};

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    cargarEstado();
    renderizarControles();
    renderizarCalendario();
});

// Cargar estado desde localStorage
function cargarEstado() {
    const guardado = localStorage.getItem('korva_horarios');
    if (guardado) {
        estado = JSON.parse(guardado);
    }
}

// Guardar estado en localStorage
function guardarEstado() {
    localStorage.setItem('korva_horarios', JSON.stringify(estado));
}

// Renderizar controles superiores
function renderizarControles() {
    const main = document.getElementById('app-workspace');
    
    const controlesHTML = `
        <div class="controls">
            <div>
                <label>Hora inicio:</label>
                <input type="time" id="horaInicio" value="07:00" onchange="actualizarConfig()">
            </div>
            <div>
                <label>Hora fin:</label>
                <input type="time" id="horaFin" value="24:00" onchange="actualizarConfig()">
            </div>
            <div>
                <label>Intervalo:</label>
                <select id="intervalo" onchange="actualizarConfig()">
                    <option value="15">15 minutos</option>
                    <option value="30">30 minutos</option>
                    <option value="60" selected>60 minutos</option>
                </select>
            </div>
            <button class="btn btn-secondary" onclick="limpiarHorarios()">Limpiar todo</button>
        </div>
    `;
    
    main.insertAdjacentHTML('beforeend', controlesHTML);
}

// Actualizar configuración
function actualizarConfig() {
    const horaInicioInput = document.getElementById('horaInicio').value;
    const horaFinInput = document.getElementById('horaFin').value;
    const intervaloSelect = document.getElementById('intervalo').value;
    
    const [hInicio] = horaInicioInput.split(':').map(Number);
    const [hFin] = horaFinInput.split(':').map(Number);
    
    config.horaInicio = hInicio;
    config.horaFin = hFin === 24 ? 24 : hFin;
    config.intervalo = parseInt(intervaloSelect);
    
    renderizarCalendario();
}

// Renderizar calendario semanal
function renderizarCalendario() {
    const main = document.getElementById('app-workspace');
    const controles = main.querySelector('.controls');
    
    // Limpiar contenido anterior (excepto controles)
    const existingGrid = main.querySelector('.week-grid');
    if (existingGrid) {
        existingGrid.remove();
    }
    
    const gridHTML = '<div class="week-grid"></div>';
    main.insertAdjacentHTML('beforeend', gridHTML);
    
    const grid = main.querySelector('.week-grid');
    
    // Generar un card por cada día
    diasSemana.forEach(dia => {
        const card = document.createElement('div');
        card.className = 'day-card';
        
        let slotsHTML = '';
        for (let hora = config.horaInicio; hora < config.horaFin; hora++) {
            const horaStr = `${hora.toString().padStart(2, '0')}:00`;
            const key = `${dia}_${horaStr}`;
            const contenido = estado.horarios[key] || '';
            
            slotsHTML += `
                <div class="time-slot">
                    <span class="time-label">${horaStr}</span>
                    <div class="slot-content">
                        ${contenido ? `<strong>${contenido}</strong>` : '<em style="color:#999">Libre</em>'}
                    </div>
                    <div class="slot-actions">
                        <button class="btn btn-primary" onclick="editarSlot('${key}', '${horaStr}')">Editar</button>
                    </div>
                </div>
            `;
        }
        
        card.innerHTML = `
            <h3>${dia}</h3>
            ${slotsHTML}
        `;
        
        grid.appendChild(card);
    });
}

// Editar un slot de tiempo
function editarSlot(key, hora) {
    const pistasHTML = config.pistas.map((pista, index) => 
        `<option value="${pista}">${pista}</option>`
    ).join('');
    
    const contenidoActual = estado.horarios[key] || '';
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 12px; max-width: 400px; width: 90%;">
            <h3 style="margin-bottom: 1rem;">Asignar partido</h3>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Pista:</label>
                <select id="modalPista" style="width: 100%; padding: 0.5rem; border: 2px solid #e0e0e0; border-radius: 8px;">
                    ${pistasHTML}
                </select>
            </div>
            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Partido/Evento:</label>
                <input type="text" id="modalPartido" placeholder="Ej: Equipo A vs Equipo B" 
                       value="${contenidoActual}" 
                       style="width: 100%; padding: 0.5rem; border: 2px solid #e0e0e0; border-radius: 8px;">
            </div>
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="this.closest('div').parentElement.parentElement.remove()">Cancelar</button>
                <button class="btn btn-primary" onclick="guardarSlot('${key}')">Guardar</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    window.modalKey = key;
}

// Guardar slot
function guardarSlot(key) {
    const pista = document.getElementById('modalPista').value;
    const partido = document.getElementById('modalPartido').value;
    
    if (partido.trim()) {
        estado.horarios[key] = `${pista}: ${partido}`;
        guardarEstado();
        renderizarCalendario();
    }
    
    // Cerrar modal
    const modal = document.querySelector('div[style*="position: fixed"]');
    if (modal) modal.remove();
}

// Limpiar todos los horarios
function limpiarHorarios() {
    if (confirm('¿Estás seguro de que quieres borrar todos los horarios?')) {
        estado.horarios = {};
        guardarEstado();
        renderizarCalendario();
    }
}