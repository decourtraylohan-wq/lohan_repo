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
  - Avant-poste Gelé : fort avec chemin de ronde, colline au sommet plat avec mirador, lac gelé, chalets aux toits enneigés.
  - Forteresse Infernale : lac et rivières de lave, donjon, tour de guet et passerelle surélevée.
  - Ville Fantôme (128×128) : ville dévastée avec immeubles visitables étage par étage (accueil, bureaux, casiers). La moitié sud-est est un vieux quartier : immeubles haussmanniens (pierre de taille, balcons en fer forgé, stores de café, combles en zinc avec lucarnes et cheminées) et immeubles new-yorkais (brownstone, brique, corniches, châteaux d'eau, escaliers de secours), ruelles de 3 blocs avec graffitis, place pavée avec fontaine et statue équestre dorée. Routes défoncées, cratère de bombe qui donne sur les égouts, réverbères, poubelles, accès aux égouts depuis les trottoirs.
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
- **Mode triche**, à cocher avant de lancer : vague de départ, points, armes, atouts, invincibilité, munitions infinies et spectateur. En jeu, K passe la vague, L donne +10 000 points et T active le spectateur (vol libre sans ennemis). Ces parties ne sont pas enregistrées.
- **Voitures conduisibles** (Ville) : E pour monter ou descendre, ZQSD pour conduire. Elles écrasent les ennemis, encaissent les tirs, puis prennent feu et explosent.
- **Verre cassable** : tirer à travers une vitre la brise.
- **Désert** : une pyramide au sommet du canyon abrite un portail qui mène au tombeau souterrain (et inversement). Son socle est une mesa au contour irrégulier ; un sentier de pierre serpente sur un éperon rocheux jusqu'au sable, et un autre redescend vers l'ouest. Une gorge naturelle, avec une arche de roche, traverse la montagne depuis la crevasse derrière la pyramide jusqu'au coin nord-ouest.
- **Zone de combat** qui s'agrandit à chaque vague : elle couvre toute la carte à la vague 5 en Zombies et à la vague 3 en Soldats. Il y a 30 secondes de préparation entre les vagues (N pour lancer plus tôt).
- **Eau** : on nage (Espace pour remonter ou se hisser sur un bord) et la vue devient bleue sous l'eau. Les ennemis nagent aussi, et les soldats ne peuvent pas tirer dans l'eau.
- **Dégâts de chute** à partir d'environ 4 blocs (pas dans l'eau).
- **Toundra** : mirador sur pilotis au sommet de la colline, escalier qui tourne autour jusqu'à la plateforme (armoire du sniper), trappe vers une cave creusée dans la colline et mine cachée qui ressort au pied de la colline par une entrée boisée.
- **Escaliers** en vraies marches partout, avec un palier en haut et une marche tournée quand ils débouchent sur le côté, avec assez de hauteur pour monter. La Ville a des escaliers de secours métalliques à la new-yorkaise (passerelle à chaque étage et volées alternées).
- **Mode Classé** : 7 rangs, de Bronze à Légende. La difficulté augmente avec le rang.
- **Statistiques** : carrière, record par carte et par type de partie, historique et détail vague par vague. Tout est sauvegardé dans le navigateur.

## Contrôles

| Touche | Action |
|---|---|
| ZQSD / WASD | Se déplacer |
| Maj | Sprinter |
| C | S'accroupir (double appui : rester accroupi) ; glissade en sprintant |
| X | Plaque d'armure |
| F | Mode construction |
| Espace | Sauter |
| Clic gauche / droit | Tirer / viser |
| R | Recharger |
| 1 2 3 / molette | Changer d'arme |
| E | Acheter / interagir / voiture, sinon couteau |
| V / clic molette | Couteau |
| A / G | Grenade |
| N | Lancer la vague suivante |
| Tab | Stats de la partie |
| Échap | Pause |
