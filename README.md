# DEADBLOCK

Jeu de survie zombie par vagues, en vue subjective, dans un monde en blocs. Il tourne directement dans le navigateur (Three.js, aucune installation).

## Lancer le jeu

Ouvre `index.html` dans Chrome, Edge ou Firefox. Tu peux aussi le servir en local :

```bash
python3 -m http.server 8000
```

puis va sur http://localhost:8000.

## Contenu

- **4 cartes** : Village Sylvestre, Ruines du Désert, Avant-poste Gelé (de nuit, sous la neige), Forteresse Infernale (avec des rivières de lave).
- **8 armes** : pistolet, SMG, fusil à pompe, fusil d'assaut, sniper, revolver, LMG et le Désintégrateur (arme à effet de zone). Elles s'achètent sur les socles dorés ou dans la caisse mystère, et la Forge ★ (à partir de la vague 8) les améliore.
- **6 atouts** (machines colorées) qui s'activent au fil des vagues : Cuirasse, Rafale, Main Leste, Second Souffle, Foulée, Bandoulière.
- **6 bonus lâchés par les zombies** : Munitions max, Mort instantanée, Points ×2, Bombe, Fureur, Butin.
- **Ennemis** : zombie, Coureur, Brute, Gonflé (explose), Cracheur (attaque à distance), Blindé (casque), plus les squelettes invoqués.
- **Boss toutes les 5 vagues** : le Colosse (frappe le sol, il faut sauter), le Nécromancien (invoque des squelettes, se téléporte, lance des orbes) et le Bélier (charge ; s'il percute un mur, il est étourdi et prend 2× plus de dégâts). Ils reviennent plus forts à chaque cycle.
- **Mode Classé** : 7 rangs (de Bronze à Légende, en RP). Tu gagnes ou perds des RP selon la vague atteinte par rapport à l'objectif de ton rang. Plus ton rang monte, plus les zombies sont résistants et rapides, plus les spéciaux arrivent tôt et moins il y a de bonus.
- **Statistiques** : carrière complète, record par carte, historique des 60 dernières parties et détail vague par vague de chaque partie. Tout est sauvegardé dans le navigateur (localStorage).

## Contrôles

| Touche | Action |
|---|---|
| ZQSD / WASD | Se déplacer |
| Maj | Sprinter |
| Espace | Sauter |
| Clic gauche / droit | Tirer / viser |
| R | Recharger |
| 1 2 3 / molette | Changer d'arme |
| E | Acheter / interagir |
| V | Couteau |
| G | Grenade |
| N | Lancer la vague suivante |
| Tab | Stats de la partie |
| Échap | Pause |
