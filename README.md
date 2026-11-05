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
- **Déplacements** : sprint, glissade (C pendant un sprint), accroupi (C maintenu, plus précis et plus dur à toucher), couteau avec fente et coup fatal dans le dos (V ou clic molette).
- **Armure** : 3 plaques de 50 qui absorbent 75 % des dégâts (touche X pour en mettre une).
- **Constructions** : à fabriquer avec des points aux établis ⚒ placés dans les maisons, puis à poser avec B et un clic.
  - barricade de sacs de sable : abri bas derrière lequel s'accroupir ;
  - bouclier énergétique : arrête les balles ennemies mais laisse passer les vôtres.

  Chacune a une durabilité ; les zombies la frappent et les soldats tirent dessus.
- **Soldats plus tactiques** : ils cherchent un abri d'où ils peuvent tirer, s'y accroupissent, se relèvent pour tirer, rechargent à couvert, courent d'abri en abri, se déplacent en escouades et lancent des grenades pour vous déloger.
- **Mode triche**, à cocher avant de lancer : vague de départ, points, armes, atouts, invincibilité, munitions infinies. En jeu, K passe la vague et L donne +10 000 points. Ces parties ne sont pas enregistrées.
- **Désert** : une pyramide au sommet du canyon abrite un portail qui mène au tombeau souterrain (et inversement).
- **Mode Classé** : 7 rangs, de Bronze à Légende. La difficulté augmente avec le rang.
- **Statistiques** : carrière, record par carte et par type de partie, historique et détail vague par vague. Tout est sauvegardé dans le navigateur.

## Contrôles

| Touche | Action |
|---|---|
| ZQSD / WASD | Se déplacer |
| Maj | Sprinter |
| C | S'accroupir ; glissade en sprintant |
| X | Plaque d'armure |
| B | Mode construction |
| Espace | Sauter |
| Clic gauche / droit | Tirer / viser |
| R | Recharger |
| 1 2 3 / molette | Changer d'arme |
| E | Acheter / interagir |
| V / clic molette | Couteau |
| G | Grenade |
| N | Lancer la vague suivante |
| Tab | Stats de la partie |
| Échap | Pause |
