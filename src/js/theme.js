window.applyTheme = function(t) {
  document.body.className = document.body.className.replace(/theme-\w+/g,'').trim();
  if (t !== 'ocean') document.body.classList.add('theme-'+t);
  localStorage.setItem('henry_theme', t);
};

// ── Final safety wire: attach topbar buttons AFTER all scripts loaded ──
window.addEventListener('load', function() {
  var map = {
    'space-btn':   function(){ window.openSpacePanel?.(); },
    'markets-btn': function(){ window.openMarketsPanel?.(); },
    'radar-btn':   function(){ window.openRadarPanel?.(); },
    'storm-btn':   function(){ window.openStormPanel?.(); },
    'periodic-btn': function(){ window.openPeriodicTable?.(); },
    'flight-btn':  function(){ window.openFlightTracker?.(); },
    'brain-btn':   function(){ window.openBrain?.(); },
    'globe-btn':   function(){ window.openGlobeMap?.(); },
    'animal-btn':  function(){ window.openAnimalScanner?.(); },
    'plant-btn':   function(){ window.openPlantScanner?.(); },
    'theme-btn':   function(){
      var o = document.getElementById('theme-overlay');
      if(o) o.style.display = o.style.display==='flex' ? 'none' : 'flex';
    }
  };
  Object.keys(map).forEach(function(id){
    var el = document.getElementById(id);
    if(el){ el.onclick = null; el.addEventListener('click', map[id]); }
  });
});
