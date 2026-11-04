// Démarrage
window.addEventListener('DOMContentLoaded', () => {
  G.Tex.buildAtlas();
  G.game = new G.Game(document.getElementById('game'));
  G.UI.init();
});
