// Démarrage
window.addEventListener('DOMContentLoaded', () => {
  if (THREE.ColorManagement) THREE.ColorManagement.legacyMode = false; // couleurs hexadécimales en sRGB
  G.Tex.buildAtlas();
  G.game = new G.Game(document.getElementById('game'));
  G.UI.init();
});
