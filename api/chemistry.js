// ══════════════════════════════════════════════════════
// CHEMISTRY API - Server-side data endpoint
// ══════════════════════════════════════════════════════

const periodicTableData = [
    { number: 1, symbol: 'H', name: 'Hydrogen', category: 'nonmetal', mass: '1.008', config: '1s¹', group: 1, period: 1 },
    { number: 2, symbol: 'He', name: 'Helium', category: 'noble-gas', mass: '4.0026', config: '1s²', group: 18, period: 1 },
    { number: 3, symbol: 'Li', name: 'Lithium', category: 'alkali-metal', mass: '6.94', config: '[He] 2s¹', group: 1, period: 2 },
    { number: 4, symbol: 'Be', name: 'Beryllium', category: 'alkaline-earth', mass: '9.0122', config: '[He] 2s²', group: 2, period: 2 },
    { number: 5, symbol: 'B', name: 'Boron', category: 'metalloid', mass: '10.81', config: '[He] 2s² 2p¹', group: 13, period: 2 },
    { number: 6, symbol: 'C', name: 'Carbon', category: 'nonmetal', mass: '12.011', config: '[He] 2s² 2p²', group: 14, period: 2 },
    { number: 7, symbol: 'N', name: 'Nitrogen', category: 'nonmetal', mass: '14.007', config: '[He] 2s² 2p³', group: 15, period: 2 },
    { number: 8, symbol: 'O', name: 'Oxygen', category: 'nonmetal', mass: '15.999', config: '[He] 2s² 2p⁴', group: 16, period: 2 },
    { number: 9, symbol: 'F', name: 'Fluorine', category: 'halogen', mass: '18.998', config: '[He] 2s² 2p⁵', group: 17, period: 2 },
    { number: 10, symbol: 'Ne', name: 'Neon', category: 'noble-gas', mass: '20.180', config: '[He] 2s² 2p⁶', group: 18, period: 2 },
    { number: 11, symbol: 'Na', name: 'Sodium', category: 'alkali-metal', mass: '22.990', config: '[Ne] 3s¹', group: 1, period: 3 },
    { number: 12, symbol: 'Mg', name: 'Magnesium', category: 'alkaline-earth', mass: '24.305', config: '[Ne] 3s²', group: 2, period: 3 },
    { number: 13, symbol: 'Al', name: 'Aluminium', category: 'post-transition', mass: '26.982', config: '[Ne] 3s² 3p¹', group: 13, period: 3 },
    { number: 14, symbol: 'Si', name: 'Silicon', category: 'metalloid', mass: '28.085', config: '[Ne] 3s² 3p²', group: 14, period: 3 },
    { number: 15, symbol: 'P', name: 'Phosphorus', category: 'nonmetal', mass: '30.974', config: '[Ne] 3s² 3p³', group: 15, period: 3 },
    { number: 16, symbol: 'S', name: 'Sulfur', category: 'nonmetal', mass: '32.06', config: '[Ne] 3s² 3p⁴', group: 16, period: 3 },
    { number: 17, symbol: 'Cl', name: 'Chlorine', category: 'halogen', mass: '35.45', config: '[Ne] 3s² 3p⁵', group: 17, period: 3 },
    { number: 18, symbol: 'Ar', name: 'Argon', category: 'noble-gas', mass: '39.948', config: '[Ne] 3s² 3p⁶', group: 18, period: 3 },
    { number: 19, symbol: 'K', name: 'Potassium', category: 'alkali-metal', mass: '39.098', config: '[Ar] 4s¹', group: 1, period: 4 },
    { number: 20, symbol: 'Ca', name: 'Calcium', category: 'alkaline-earth', mass: '40.078', config: '[Ar] 4s²', group: 2, period: 4 },
    { number: 26, symbol: 'Fe', name: 'Iron', category: 'transition-metal', mass: '55.845', config: '[Ar] 3d⁶ 4s²', group: 8, period: 4 },
    { number: 29, symbol: 'Cu', name: 'Copper', category: 'transition-metal', mass: '63.546', config: '[Ar] 3d¹⁰ 4s¹', group: 11, period: 4 },
    { number: 47, symbol: 'Ag', name: 'Silver', category: 'transition-metal', mass: '107.87', config: '[Kr] 4d¹⁰ 5s¹', group: 11, period: 5 },
    { number: 79, symbol: 'Au', name: 'Gold', category: 'transition-metal', mass: '196.97', config: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹', group: 11, period: 6 }
];

const molecules = {
    'H2O': {
        name: 'Water',
        formula: 'H₂O',
        type: 'Covalent (Polar)',
        bonds: '2 O-H single bonds',
        angle: '104.5°',
        geometry: 'Bent/V-shaped',
        hybridization: 'sp³'
    },
    'CO2': {
        name: 'Carbon Dioxide',
        formula: 'CO₂',
        type: 'Covalent (Nonpolar)',
        bonds: '2 C=O double bonds',
        angle: '180°',
        geometry: 'Linear',
        hybridization: 'sp'
    },
    'CH4': {
        name: 'Methane',
        formula: 'CH₄',
        type: 'Covalent (Nonpolar)',
        bonds: '4 C-H single bonds',
        angle: '109.5°',
        geometry: 'Tetrahedral',
        hybridization: 'sp³'
    },
    'NH3': {
        name: 'Ammonia',
        formula: 'NH₃',
        type: 'Covalent (Polar)',
        bonds: '3 N-H bonds + 1 lone pair',
        angle: '107°',
        geometry: 'Trigonal pyramidal',
        hybridization: 'sp³'
    },
    'NaCl': {
        name: 'Sodium Chloride',
        formula: 'NaCl',
        type: 'Ionic',
        bonds: 'Na⁺ Cl⁻ ionic bond',
        angle: 'N/A',
        geometry: 'Crystal lattice',
        hybridization: 'N/A'
    },
    'C6H12O6': {
        name: 'Glucose',
        formula: 'C₆H₁₂O₆',
        type: 'Covalent (Organic)',
        bonds: 'Multiple C-C, C-H, C-O, O-H',
        angle: 'Various',
        geometry: 'Cyclic (pyranose)',
        hybridization: 'sp³'
    }
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { type, symbol, molecule } = req.query;
    
    // Get all elements
    if (type === 'elements') {
        return res.status(200).json({ elements: periodicTableData });
    }
    
    // Get specific element
    if (type === 'element' && symbol) {
        const element = periodicTableData.find(el => el.symbol.toLowerCase() === symbol.toLowerCase());
        if (element) {
            return res.status(200).json({ element });
        }
        return res.status(404).json({ error: 'Element not found' });
    }
    
    // Get all molecules
    if (type === 'molecules') {
        return res.status(200).json({ molecules });
    }
    
    // Get specific molecule
    if (type === 'molecule' && molecule) {
        const mol = molecules[molecule];
        if (mol) {
            return res.status(200).json({ molecule: mol });
        }
        return res.status(404).json({ error: 'Molecule not found' });
    }
    
    // Default: return all data
    return res.status(200).json({
        elements: periodicTableData,
        molecules: molecules
    });
};
