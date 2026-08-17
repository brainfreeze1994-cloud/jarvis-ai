// Periodic Table Data
const periodicTableData = [
    { number: 1, symbol: 'H', name: 'Hydrogen', category: 'nonmetal', mass: '1.008', config: '1s¹' },
    { number: 2, symbol: 'He', name: 'Helium', category: 'noble-gas', mass: '4.0026', config: '1s²' },
    { number: 3, symbol: 'Li', name: 'Lithium', category: 'alkali-metal', mass: '6.94', config: '[He] 2s¹' },
    { number: 4, symbol: 'Be', name: 'Beryllium', category: 'alkaline-earth', mass: '9.0122', config: '[He] 2s²' },
    { number: 5, symbol: 'B', name: 'Boron', category: 'metalloid', mass: '10.81', config: '[He] 2s² 2p¹' },
    { number: 6, symbol: 'C', name: 'Carbon', category: 'nonmetal', mass: '12.011', config: '[He] 2s² 2p²' },
    { number: 7, symbol: 'N', name: 'Nitrogen', category: 'nonmetal', mass: '14.007', config: '[He] 2s² 2p³' },
    { number: 8, symbol: 'O', name: 'Oxygen', category: 'nonmetal', mass: '15.999', config: '[He] 2s² 2p⁴' },
    { number: 9, symbol: 'F', name: 'Fluorine', category: 'halogen', mass: '18.998', config: '[He] 2s² 2p⁵' },
    { number: 10, symbol: 'Ne', name: 'Neon', category: 'noble-gas', mass: '20.180', config: '[He] 2s² 2p⁶' },
    { number: 11, symbol: 'Na', name: 'Sodium', category: 'alkali-metal', mass: '22.990', config: '[Ne] 3s¹' },
    { number: 12, symbol: 'Mg', name: 'Magnesium', category: 'alkaline-earth', mass: '24.305', config: '[Ne] 3s²' },
    { number: 13, symbol: 'Al', name: 'Aluminium', category: 'post-transition', mass: '26.982', config: '[Ne] 3s² 3p¹' },
    { number: 14, symbol: 'Si', name: 'Silicon', category: 'metalloid', mass: '28.085', config: '[Ne] 3s² 3p²' },
    { number: 15, symbol: 'P', name: 'Phosphorus', category: 'nonmetal', mass: '30.974', config: '[Ne] 3s² 3p³' },
    { number: 16, symbol: 'S', name: 'Sulfur', category: 'nonmetal', mass: '32.06', config: '[Ne] 3s² 3p⁴' },
    { number: 17, symbol: 'Cl', name: 'Chlorine', category: 'halogen', mass: '35.45', config: '[Ne] 3s² 3p⁵' },
    { number: 18, symbol: 'Ar', name: 'Argon', category: 'noble-gas', mass: '39.948', config: '[Ne] 3s² 3p⁶' },
    { number: 19, symbol: 'K', name: 'Potassium', category: 'alkali-metal', mass: '39.098', config: '[Ar] 4s¹' },
    { number: 20, symbol: 'Ca', name: 'Calcium', category: 'alkaline-earth', mass: '40.078', config: '[Ar] 4s²' },
    { number: 26, symbol: 'Fe', name: 'Iron', category: 'transition-metal', mass: '55.845', config: '[Ar] 3d⁶ 4s²' },
    { number: 29, symbol: 'Cu', name: 'Copper', category: 'transition-metal', mass: '63.546', config: '[Ar] 3d¹⁰ 4s¹' },
    { number: 47, symbol: 'Ag', name: 'Silver', category: 'transition-metal', mass: '107.87', config: '[Kr] 4d¹⁰ 5s¹' },
    { number: 79, symbol: 'Au', name: 'Gold', category: 'transition-metal', mass: '196.97', config: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹' }
];

// Molecular Structures Data
const molecules = {
    'H2O': {
        name: 'Water',
        formula: 'H₂O',
        type: 'Covalent (Polar)',
        bonds: '2 O-H single bonds',
        angle: '104.5°',
        geometry: 'Bent/V-shaped',
        hybridization: 'sp³',
        atoms: [
            { symbol: 'O', x: 250, y: 250, radius: 40, color: '#FF0000' },
            { symbol: 'H', x: 180, y: 320, radius: 25, color: '#FFFFFF' },
            { symbol: 'H', x: 320, y: 320, radius: 25, color: '#FFFFFF' }
        ],
        bonds: [
            { from: 0, to: 1 },
            { from: 0, to: 2 }
        ]
    },
    'CO2': {
        name: 'Carbon Dioxide',
        formula: 'CO₂',
        type: 'Covalent (Nonpolar)',
        bonds: '2 C=O double bonds',
        angle: '180°',
        geometry: 'Linear',
        hybridization: 'sp',
        atoms: [
            { symbol: 'C', x: 250, y: 250, radius: 35, color: '#000000' },
            { symbol: 'O', x: 150, y: 250, radius: 35, color: '#FF0000' },
            { symbol: 'O', x: 350, y: 250, radius: 35, color: '#FF0000' }
        ],
        bonds: [
            { from: 0, to: 1, type: 'double' },
            { from: 0, to: 2, type: 'double' }
        ]
    },
    'CH4': {
        name: 'Methane',
        formula: 'CH',
        type: 'Covalent (Nonpolar)',
        bonds: '4 C-H single bonds',
        angle: '109.5°',
        geometry: 'Tetrahedral',
        hybridization: 'sp³',
        atoms: [
            { symbol: 'C', x: 250, y: 250, radius: 35, color: '#000000' },
            { symbol: 'H', x: 250, y: 180, radius: 25, color: '#FFFFFF' },
            { symbol: 'H', x: 190, y: 310, radius: 25, color: '#FFFFFF' },
            { symbol: 'H', x: 310, y: 310, radius: 25, color: '#FFFFFF' },
            { symbol: 'H', x: 250, y: 330, radius: 25, color: '#AAAAAA' }
        ],
        bonds: [
            { from: 0, to: 1 },
            { from: 0, to: 2 },
            { from: 0, to: 3 },
            { from: 0, to: 4 }
        ]
    },
    'NH3': {
        name: 'Ammonia',
        formula: 'NH',
        type: 'Covalent (Polar)',
        bonds: '3 N-H bonds + 1 lone pair',
        angle: '107°',
        geometry: 'Trigonal pyramidal',
        hybridization: 'sp³',
        atoms: [
            { symbol: 'N', x: 250, y: 220, radius: 35, color: '#0000FF' },
            { symbol: 'H', x: 190, y: 300, radius: 25, color: '#FFFFFF' },
            { symbol: 'H', x: 250, y: 310, radius: 25, color: '#FFFFFF' },
            { symbol: 'H', x: 310, y: 300, radius: 25, color: '#FFFFFF' }
        ],
        bonds: [
            { from: 0, to: 1 },
            { from: 0, to: 2 },
            { from: 0, to: 3 }
        ],
        lonePairs: [{ x: 250, y: 160 }]
    },
    'NaCl': {
        name: 'Sodium Chloride',
        formula: 'NaCl',
        type: 'Ionic',
        bonds: 'Na⁺ Cl⁻ ionic bond',
        angle: 'N/A',
        geometry: 'Crystal lattice',
        hybridization: 'N/A',
        atoms: [
            { symbol: 'Na⁺', x: 220, y: 250, radius: 35, color: '#9ACD32' },
            { symbol: 'Cl⁻', x: 280, y: 250, radius: 40, color: '#00FF00' }
        ],
        bonds: [
            { from: 0, to: 1, type: 'ionic' }
        ]
    },
    'C6H12O6': {
        name: 'Glucose',
        formula: 'C₆H₁₂O',
        type: 'Covalent (Organic)',
        bonds: 'Multiple C-C, C-H, C-O, O-H',
        angle: 'Various',
        geometry: 'Cyclic (pyranose)',
        hybridization: 'sp³',
        atoms: [
            { symbol: 'C', x: 250, y: 200, radius: 30, color: '#000000' },
            { symbol: 'C', x: 290, y: 230, radius: 30, color: '#000000' },
            { symbol: 'C', x: 290, y: 270, radius: 30, color: '#000000' },
            { symbol: 'C', x: 250, y: 300, radius: 30, color: '#000000' },
            { symbol: 'C', x: 210, y: 270, radius: 30, color: '#000000' },
            { symbol: 'O', x: 210, y: 230, radius: 30, color: '#FF0000' }
        ],
        bonds: [
            { from: 0, to: 1 },
            { from: 1, to: 2 },
            { from: 2, to: 3 },
            { from: 3, to: 4 },
            { from: 4, to: 5 },
            { from: 5, to: 0 }
        ]
    }
};

let currentMolecule = 'H2O';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderPeriodicTable();
    showMolecule('H2O');
    refreshISS();
    refreshAsteroids();
});

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// Periodic Table Rendering
function renderPeriodicTable() {
    const table = document.getElementById('periodicTable');
    table.innerHTML = '';
    
    periodicTableData.forEach(el => {
        const elementDiv = document.createElement('div');
        elementDiv.className = `element ${el.category}`;
        elementDiv.innerHTML = `
            <span class="number">${el.number}</span>
            <span class="symbol">${el.symbol}</span>
            <span class="name">${el.name}</span>
        `;
        
        elementDiv.onclick = () => showElementDetails(el);
        table.appendChild(elementDiv);
    });
}

function showElementDetails(el) {
    const details = document.getElementById('elementDetails');
    document.getElementById('elName').textContent = `${el.number}. ${el.name} (${el.symbol})`;
    document.getElementById('elInfo').innerHTML = `
        <strong>Category:</strong> ${el.category.replace('-', ' ')}<br>
        <strong>Atomic Mass:</strong> ${el.mass} u<br>
        <strong>Electron Configuration:</strong> ${el.config}
    `;
    details.style.display = 'block';
}

// Molecular Structure Viewer
function showMolecule(molKey) {
    currentMolecule = molKey;
    const mol = molecules[molKey];
    
    // Update buttons
    document.querySelectorAll('.molecule-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.textContent.includes(molKey)) btn.classList.add('active');
    });
    
    // Draw molecule
    drawMolecule(mol);
    
    // Update info
    document.getElementById('structureInfo').innerHTML = `
        <h3>${mol.name}</h3>
        <div class="info-row"><span class="info-label">Formula:</span><span>${mol.formula}</span></div>
        <div class="info-row"><span class="info-label">Bond Type:</span><span>${mol.type}</span></div>
        <div class="info-row"><span class="info-label">Bonds:</span><span>${mol.bonds}</span></div>
        <div class="info-row"><span class="info-label">Bond Angle:</span><span>${mol.angle}</span></div>
        <div class="info-row"><span class="info-label">Geometry:</span><span>${mol.geometry}</span></div>
        <div class="info-row"><span class="info-label">Hybridization:</span><span>${mol.hybridization}</span></div>
    `;
}

function drawMolecule(mol) {
    const canvas = document.getElementById('moleculeCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bonds first
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 4;
    mol.bonds.forEach(bond => {
        const from = mol.atoms[bond.from];
        const to = mol.atoms[bond.to];
        
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        
        // Double bond
        if (bond.type === 'double') {
            ctx.beginPath();
            ctx.moveTo(from.x + 5, from.y);
            ctx.lineTo(to.x + 5, to.y);
            ctx.stroke();
        }
    });
    
    // Draw atoms
    mol.atoms.forEach(atom => {
        ctx.beginPath();
        ctx.arc(atom.x, atom.y, atom.radius, 0, Math.PI * 2);
        ctx.fillStyle = atom.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = atom.color === '#FFFFFF' || atom.color === '#AAAAAA' ? '#000' : '#fff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(atom.symbol, atom.x, atom.y);
    });
    
    // Draw lone pairs
    if (mol.lonePairs) {
        mol.lonePairs.forEach(pair => {
            ctx.beginPath();
            ctx.arc(pair.x, pair.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#FFD700';
            ctx.fill();
        });
    }
}

// Export Functions
function exportToExcel() {
    try {
        const wb = XLSX.utils.book_new();
        const wsData = periodicTableData.map(el => ({
            'Atomic Number': el.number,
            'Symbol': el.symbol,
            'Name': el.name,
            'Category': el.category,
            'Atomic Mass': el.mass,
            'Electron Config': el.config
        }));
        
        const ws = XLSX.utils.json_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'Periodic Table');
        XLSX.writeFile(wb, 'HENRY_PeriodicTable.xlsx');
        showExportStatus('✅ Excel file downloaded successfully!', 'success');
    } catch (e) {
        showExportStatus('❌ Error: ' + e.message, 'error');
    }
}

function exportToPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text('H·E·N·R·Y™ - Periodic Table', 10, 20);
        
        doc.setFontSize(12);
        let y = 40;
        periodicTableData.forEach((el, i) => {
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
            doc.text(`${el.number}. ${el.name} (${el.symbol}) - ${el.mass} u`, 10, y);
            y += 10;
        });
        
        doc.save('HENRY_PeriodicTable.pdf');
        showExportStatus('✅ PDF file downloaded successfully!', 'success');
    } catch (e) {
        showExportStatus('❌ Error: ' + e.message, 'error');
    }
}

function exportToJSON() {
    const dataStr = JSON.stringify(periodicTableData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'HENRY_PeriodicTable.json';
    a.click();
    showExportStatus('✅ JSON file downloaded successfully!', 'success');
}

function exportToCSV() {
    const headers = ['Atomic Number', 'Symbol', 'Name', 'Category', 'Atomic Mass', 'Electron Config'];
    const rows = periodicTableData.map(el => [
        el.number, el.symbol, el.name, el.category, el.mass, el.config
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'HENRY_PeriodicTable.csv';
    a.click();
    showExportStatus('✅ CSV file downloaded successfully!', 'success');
}

function showExportStatus(message, type) {
    const status = document.getElementById('exportStatus');
    status.textContent = message;
    status.style.display = 'block';
    status.style.background = type === 'success' ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)';
    setTimeout(() => status.style.display = 'none', 5000);
}

// Space Tracker
async function refreshISS() {
    try {
        const res = await fetch('http://api.open-notify.org/iss-now.json');
        const data = await res.json();
        const lat = parseFloat(data.iss_position.latitude).toFixed(2);
        const lon = parseFloat(data.iss_position.longitude).toFixed(2);
        const altitude = 408;
        
        document.getElementById('issData').innerHTML = `
            <p><strong>Latitude:</strong> ${lat}°</p>
            <p><strong>Longitude:</strong> ${lon}°</p>
            <p><strong>Altitude:</strong> ${altitude} km</p>
            <ul class="comparison-list">
                <li><strong>Mount Everest:</strong> 8.8 km (ISS is <strong>${(altitude/8.8).toFixed(0)}x higher</strong>)</li>
                <li><strong>Commercial Flight:</strong> 11 km (ISS is <strong>${(altitude/11).toFixed(0)}x higher</strong>)</li>
                <li><strong>Earth Radius:</strong> 6,371 km (ISS at <strong>${((altitude/6371)*100).toFixed(2)}%</strong>)</li>
            </ul>
        `;
    } catch (e) {
        document.getElementById('issData').innerHTML = '<p style="color: #ff6b6b;">Error loading ISS data</p>';
    }
}

async function refreshAsteroids() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0];
        
        const res = await fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${weekAgo}&end_date=${today}&api_key=DEMO_KEY`);
        const data = await res.json();
        
        let allAsteroids = [];
        Object.values(data.near_earth_objects).forEach(list => {
            allAsteroids = allAsteroids.concat(list);
        });
        
        const total = allAsteroids.length;
        const hazardous = allAsteroids.filter(a => a.is_potentially_hazardous_asteroid).length;
        
        document.getElementById('asteroidData').innerHTML = `
            <p><strong>Total this week:</strong> ${total}</p>
            <p><strong>Potentially hazardous:</strong> ${hazardous}</p>
            <p style="margin-top: 10px; font-size: 12px; color: #aaa;">
                <em>"Potentially Hazardous" means >140m and within 7.5M km of Earth. 
                Not on collision course. Earth is safe!</em>
            </p>
        `;
    } catch (e) {
        document.getElementById('asteroidData').innerHTML = '<p style="color: #ff6b6b;">Error loading asteroid data</p>';
    }
}
