# DEADBLOCK

Jeu de survie zombie par vagues, en vue subjective, dans un monde en blocs. Il tourne directement dans le navigateur (Three.js, aucune installation).

## Lancer le jeu

Ouvre `index.html` dans Chrome, Edge ou Firefox. Tu peux aussi le servir en local :

```bash
python3 -m http.server 8000
```

puis va sur http://localhost:8000.

## Contenu

- **2 types de partie**, à choisir avant de lancer :
  - **Zombies** : des hordes et des boss monstrueux.
  - **Soldats** : des escouades armées qui tirent en rafales, se déplacent, lancent des grenades et utilisent des fusils de précision à laser.
- **2 modes** : Classique ou Classé.
- **5 cartes** :
  - Village Sylvestre : lac, rivière avec un pont, champs de blé, grange, colline boisée.
  - Ruines du Désert : ziggourat, canyon de mesas, oasis, tombeau souterrain.
  - Avant-poste Gelé : fort avec chemin de ronde, montagne avec belvédère, lac gelé, chalets.
  - Forteresse Infernale : lac et rivières de lave, donjon, tour de guet et passerelle surélevée.
  - Ville Fantôme : immeubles visitables étage par étage jusqu'au toit, magasins, parkings, parc, et égouts sous les rues d'où sortent les ennemis.
- **8 armes détaillées** : culasse, pompe et chargeur animés, éjection des douilles, visée par les organes de visée. Elles s'achètent sur des socles ou dans la caisse mystère, et la Forge ★ les améliore (camouflage violet).
- **6 atouts** qui s'activent au fil des vagues, et **6 bonus** lâchés par les ennemis.
- **Zombies** : zombie, Coureur, Rampant, Brute, Traqueur (quadrupède qui bondit), Gonflé, Hurleuse (son cri ralentit le joueur et enrage les autres zombies), Cracheur, Blindé. Boss : Colosse, Nécromancien, Bélier.
- **Soldats** : Fantassin, Assaillant, Brécheur, Tireur d'élite, Mitrailleur, Grenadier. Boss : Juggernaut (minigun), Commandant (appelle des renforts), Pyromane (lance-flammes).
- **Rendu** :
  - ciel dégradé avec soleil et étoiles ;
  - ombres dynamiques (qualité haute) ;
  - léger shader de post-traitement (étalonnage des couleurs par carte, vignettage, grain, distorsion au cri de la Hurleuse) ;
  - occlusion ambiante, végétation (herbes hautes, fleurs, blé).
- **Sons synthétisés** : détonations en plusieurs couches, réverbération, sons spatialisés (gauche/droite et distance), sifflement des balles qui vous ratent, ambiance par carte, battements de cœur quand la vie est basse.
- **Mode Classé** : 7 rangs, de Bronze à Légende. La difficulté augmente avec le rang.
- **Statistiques** : carrière, record par carte et par type de partie, historique et détail vague par vague. Tout est sauvegardé dans le navigateur.

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
