let periodicTableData = [];
let molecules = {};

// Fetch data from API on load
async function loadData() {
  try {
    const response = await fetch('/api/chemistry?type=all');
    const data = await response.json();
    periodicTableData = data.elements;
    molecules = data.molecules;
        
    // Initialize UI after data loads
    renderPeriodicTable();
    showMolecule('H2O');
    refreshISS();
    refreshAsteroids();
  } catch (error) {
    console.error('Error loading chemistry data:', error);
    // Fallback to static data if API fails
    loadFallbackData();
  }
}

function loadFallbackData() {
  // Your existing static data arrays go here as fallback
  periodicTableData = [
    // ... (your existing static data)
  ];
  molecules = {
    // ... (your existing static data)
  };
  renderPeriodicTable();
  showMolecule('H2O');
}

// Call loadData instead of direct initialization
document.addEventListener('DOMContentLoaded', () => {
  loadData();
});
