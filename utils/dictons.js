// ═══════════════════════════════════════════
//  DICTONS.JS — Source unique du "dicton du jour"
//  LOT 65 : corrige un bug remonté par David — le dicton de
//  l'accueil semblait "toujours le même". Deux causes réunies :
//  1) HomeScreen.js tirait le dicton au hasard (Math.random()) à
//     CHAQUE ouverture de l'écran plutôt qu'une fois par jour —
//     avec seulement 5 dictons, deux tirages consécutifs tombaient
//     souvent sur le même (~20% de chances à chaque réouverture).
//  2) La liste ne comptait que 5 entrées, et HomeScreen.js /
//     widgetUpdater.js avaient chacun leur propre copie, avec deux
//     logiques de sélection différentes (aléatoire vs date) —
//     source de confusion et de désynchronisation entre l'accueil
//     et le widget plein écran.
//
//  Correctif : une seule liste, largement étoffée, et une sélection
//  déterministe basée sur le jour de l'année — le dicton change
//  une fois par jour (pas à chaque ouverture d'écran), et l'accueil
//  affiche exactement le même dicton que le widget.
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
//  DICTONS.JS — Source unique du "dicton du jour"
//  LOT 65 : corrige un bug remonté par David — le dicton de
//  l'accueil semblait "toujours le même". Trois causes réunies :
//  1) HomeScreen.js tirait le dicton au hasard (Math.random()) à
//     CHAQUE ouverture de l'écran plutôt qu'une fois par jour —
//     avec seulement 5 dictons, deux tirages consécutifs tombaient
//     souvent sur le même (~20% de chances à chaque réouverture).
//  2) La liste ne comptait que 5 entrées, et HomeScreen.js /
//     widgetUpdater.js avaient chacun leur propre copie, avec deux
//     logiques de sélection différentes (aléatoire vs date) —
//     source de confusion et de désynchronisation entre l'accueil
//     et le widget plein écran.
//  3) (retour du 31/07) Même corrigée, une liste de 20 puis 103 entrées
//     revenait encore trop tôt pour ne jamais sentir de redite sur
//     plusieurs mois. Passée à 217 entrées à la demande de David.
//
//  Correctif : une seule liste, largement étoffée (217 dictons,
//  thèmes variés en écho aux modules de l'app), et une sélection
//  déterministe — le dicton change une fois par jour (pas à chaque
//  ouverture d'écran), est identique partout dans l'app (accueil et
//  widget), et l'ordre d'apparition change d'une année sur l'autre
//  (pas un simple cycle "jour 1, jour 2, jour 3..." qui reviendrait
//  À L'IDENTIQUE chaque année).
// ═══════════════════════════════════════════

export const DICTONS = [
  // — Musique & créativité —
  { t: 'La musique est la sténographie des émotions.', a: 'Tolstoï' },
  { t: "La créativité, c'est l'intelligence qui s'amuse.", a: 'Albert Einstein' },
  { t: 'Un accord de guitare bien joué vaut mille mots.', a: 'Sagesse musicale' },
  { t: 'Chanter, c\'est prier deux fois.', a: 'Saint Augustin' },
  { t: 'Le talent, on le doit à la persévérance plus qu\'au don.', a: 'Sagesse musicale' },
  { t: 'Chaque note fausse rapproche un peu plus de la juste.', a: 'Sagesse musicale' },
  { t: "Sans musique, la vie serait une erreur.", a: 'Friedrich Nietzsche' },
  { t: "On ne joue jamais tout à fait la même chanson deux fois.", a: 'Sagesse musicale' },
  { t: "La technique s'apprend, l'émotion se cultive.", a: 'Sagesse musicale' },
  { t: "Un musicien qui ne s'échauffe pas ressemble à un sprinteur qui ne s'étire pas.", a: 'Sagesse musicale' },
  { t: "L'improvisation, c'est la conversation avec soi-même.", a: 'Sagesse musicale' },
  { t: "Le rythme est la charpente, la mélodie en est l'âme.", a: 'Sagesse musicale' },

  // — Sagesse générale / philosophie —
  { t: 'Chaque matin est une nouvelle chance de recommencer.', a: 'Proverbe' },
  { t: "Ce n'est pas parce que les choses sont difficiles que nous n'osons pas, c'est parce que nous n'osons pas qu'elles sont difficiles.", a: 'Sénèque' },
  { t: "Il n'y a pas de vent favorable pour celui qui ne sait pas où il va.", a: 'Sénèque' },
  { t: "La patience est amère, mais son fruit est doux.", a: 'Jean-Jacques Rousseau' },
  { t: "Les étoiles ne se voient que dans le ciel le plus sombre.", a: 'Proverbe' },
  { t: "Un pas après l'autre suffit pour aller très loin.", a: 'Proverbe chinois' },
  { t: "Le meilleur moment pour planter un arbre était il y a vingt ans. Le second, c'est maintenant.", a: 'Proverbe chinois' },
  { t: "Connais-toi toi-même, et tu connaîtras l'univers et les dieux.", a: 'Socrate' },
  { t: "Ce que nous répétons chaque jour, nous devenons.", a: 'Aristote' },
  { t: "Ne cherche pas que les événements arrivent comme tu le veux, souhaite qu'ils arrivent comme ils arrivent.", a: 'Épictète' },
  { t: "Il n'est pas de vent qui soit toujours favorable pour qui ne sait où aller.", a: 'Montaigne' },
  { t: "L'homme n'est rien d'autre que ce qu'il fait de lui-même.", a: 'Jean-Paul Sartre' },
  { t: "Le bonheur, quand on le partage, se double.", a: 'Proverbe' },
  { t: "On ne voit bien qu'avec le cœur, l'essentiel est invisible pour les yeux.", a: 'Antoine de Saint-Exupéry' },
  { t: "Ceux qui ne bougent jamais ne remarquent pas leurs chaînes.", a: 'Rosa Luxemburg' },
  { t: "Il faut toujours viser la lune, car même en cas d'échec, on atterrit dans les étoiles.", a: 'Proverbe' },
  { t: "La vie, c'est comme une bicyclette, il faut avancer pour ne pas perdre l'équilibre.", a: 'Albert Einstein' },
  { t: "Ce qui ne me tue pas me rend plus fort.", a: 'Friedrich Nietzsche' },
  { t: "Rien n'est permanent, sauf le changement.", a: 'Héraclite' },
  { t: "Le sage porte son trésor en lui-même.", a: 'Ésope' },

  // — Proverbes internationaux —
  { t: "Seul on va plus vite, ensemble on va plus loin.", a: 'Proverbe africain' },
  { t: "Un seul doigt ne peut pas laver un visage.", a: 'Proverbe africain' },
  { t: "Ce n'est pas la montagne que nous conquérons, mais nous-mêmes.", a: 'Edmund Hillary' },
  { t: "Tomber sept fois, se relever huit.", a: 'Proverbe japonais' },
  { t: "Le bambou qui plie est plus fort que le chêne qui résiste.", a: 'Proverbe japonais' },
  { t: "Qui se lève tôt, la fortune lui sourit.", a: 'Proverbe' },
  { t: "Il vaut mieux allumer une bougie que maudire l'obscurité.", a: 'Proverbe chinois' },
  { t: "Une pierre qui roule n'amasse pas mousse.", a: 'Proverbe' },
  { t: "L'arbre le plus haut a commencé par une graine.", a: 'Proverbe' },
  { t: "Petit à petit, l'oiseau fait son nid.", a: 'Proverbe' },
  { t: "Rome ne s'est pas faite en un jour.", a: 'Proverbe' },
  { t: "Qui veut aller loin ménage sa monture.", a: 'Proverbe' },

  // — Santé, sport, énergie —
  { t: "Bien dormir, c'est déjà bien vivre.", a: 'Proverbe' },
  { t: "L'eau est la meilleure des potions.", a: 'Pindare' },
  { t: "Un esprit sain dans un corps sain.", a: 'Juvénal' },
  { t: "Marcher, c'est déjà avancer.", a: 'Sagesse du quotidien' },
  { t: "Le repos n'est pas la paresse, c'est la moitié du travail.", a: 'Proverbe' },
  { t: "Chaque pas compte, même le plus petit.", a: 'Sagesse du quotidien' },
  { t: "Prendre soin de son corps, c'est prendre soin de son avenir.", a: 'Sagesse du quotidien' },
  { t: "La meilleure des huit heures de sommeil est celle qui commence tôt.", a: 'Sagesse du quotidien' },
  { t: "Le mouvement, c'est la vie.", a: 'Aristote' },
  { t: "Ce n'est pas le sport qui fatigue, c'est l'immobilité qui use.", a: 'Sagesse du quotidien' },
  { t: "Boire un grand verre d'eau règle plus de soucis qu'on ne le croit.", a: 'Sagesse du quotidien' },

  // — Cuisine & gourmandise —
  { t: "Cuisiner soi-même, c'est déjà prendre soin de soi.", a: 'Sagesse du quotidien' },
  { t: "On ne mange pas seulement pour se nourrir, mais pour se faire plaisir.", a: 'Brillat-Savarin' },
  { t: "Dis-moi ce que tu manges, je te dirai ce que tu es.", a: 'Brillat-Savarin' },
  { t: "Un bon repas partagé vaut tous les discours.", a: 'Proverbe' },
  { t: "La cuisine est un acte d'amour.", a: 'Sagesse du quotidien' },
  { t: "Les meilleures recettes se transmettent, elles ne s'inventent pas seul.", a: 'Sagesse du quotidien' },
  { t: "Un plat simple bien fait vaut mieux qu'un plat compliqué raté.", a: 'Sagesse du quotidien' },

  // — Jardin, potager, saisons —
  { t: 'Un jardin, même petit, nourrit toujours un peu plus que le ventre.', a: 'Proverbe' },
  { t: "On ne récolte que ce que l'on a semé — au jardin comme ailleurs.", a: 'Proverbe' },
  { t: "Jardiner, c'est croire au lendemain.", a: 'Audrey Hepburn' },
  { t: "La patience est la vertu première du jardinier.", a: 'Sagesse du quotidien' },
  { t: "Chaque saison a ses fruits, il suffit de savoir attendre.", a: 'Proverbe' },
  { t: "Le jardin le plus riche est celui qu'on visite chaque jour.", a: 'Proverbe' },
  { t: "Semer aujourd'hui, c'est récolter demain.", a: 'Proverbe' },
  { t: "L'hiver prépare le printemps, même quand on ne le voit pas.", a: 'Sagesse du quotidien' },

  // — Organisation, quotidien, agenda —
  { t: "L'ordre règne dans une liste de courses bien tenue.", a: 'Sagesse du quotidien' },
  { t: 'Ranger sa tête commence souvent par ranger son agenda.', a: 'Sagesse du quotidien' },
  { t: "Ce qui est planifié a bien plus de chances d'être fait.", a: 'Sagesse du quotidien' },
  { t: "Une bonne journée se prépare souvent la veille au soir.", a: 'Sagesse du quotidien' },
  { t: "Faire une chose à la fois, mais la faire bien.", a: 'Proverbe' },
  { t: "Le désordre extérieur reflète souvent le désordre intérieur — et inversement.", a: 'Sagesse du quotidien' },
  { t: "Il vaut mieux une tâche terminée que dix commencées.", a: 'Proverbe' },

  // — Météo & nature —
  { t: "Après la pluie, le beau temps.", a: 'Proverbe' },
  { t: "Il n'y a pas de mauvais temps, seulement de mauvais vêtements.", a: 'Proverbe scandinave' },
  { t: "Le soleil brille pour tout le monde, encore faut-il sortir le voir.", a: 'Proverbe' },
  { t: "Un ciel gris n'empêche jamais un cœur léger.", a: 'Sagesse du quotidien' },
  { t: "La nature ne se presse jamais, et pourtant tout s'accomplit.", a: 'Lao Tseu' },

  // — Motivation, confiance, action —
  { t: "Le doute tue plus de rêves que l'échec.", a: 'Sagesse du quotidien' },
  { t: "Mieux vaut avancer lentement que ne pas avancer du tout.", a: 'Proverbe' },
  { t: "Commencer, c'est déjà la moitié du chemin.", a: 'Proverbe' },
  { t: "L'échec n'est que l'occasion de recommencer avec plus d'intelligence.", a: 'Henry Ford' },
  { t: "Ce que tu peux faire, ou rêves de faire, commence-le.", a: "Johann Wolfgang von Goethe" },
  { t: "On ne change pas ce que l'on ne regarde pas en face.", a: 'Sagesse du quotidien' },
  { t: "Chaque expert a un jour été débutant.", a: 'Proverbe' },
  { t: "La discipline est le pont entre les objectifs et leur accomplissement.", a: 'Jim Rohn' },
  { t: "Il n'y a pas de plus grande satisfaction que celle de progresser à son rythme.", a: 'Sagesse du quotidien' },

  // — Bien-être, calme, gratitude —
  { t: "Respirer, c'est déjà revenir à soi.", a: 'Sagesse du quotidien' },
  { t: "La gratitude transforme ce que l'on a en suffisance.", a: 'Sagesse du quotidien' },
  { t: "Le calme n'est pas l'absence de tempête, mais la paix au milieu.", a: 'Sagesse du quotidien' },
  { t: "On ne peut pas empêcher les vagues, mais on peut apprendre à surfer.", a: 'Jon Kabat-Zinn' },
  { t: "Un instant de silence en dit parfois plus qu'une heure de bruit.", a: 'Proverbe' },
  { t: "La joie n'est pas dans les choses, elle est en nous.", a: 'Sagesse du quotidien' },
  { t: "Prendre du temps pour soi n'est pas égoïste, c'est nécessaire.", a: 'Sagesse du quotidien' },
  { t: "Ce que l'on arrose grandit — les plantes comme les pensées.", a: 'Sagesse du quotidien' },

  // — Amitié, lien, humanité —
  { t: "Un ami fidèle est un abri sûr.", a: 'Proverbe' },
  { t: "On reconnaît le véritable ami dans le besoin.", a: 'Proverbe' },
  { t: "Partager un sourire ne coûte rien et rapporte beaucoup.", a: 'Proverbe' },
  { t: "La bienveillance est une langue que tout le monde comprend.", a: 'Mark Twain' },

  // — Musique & chant (suite) —
  { t: "Une chanson bien écrite tient en trois accords et la vérité.", a: 'Sagesse musicale' },
  { t: "La voix est le seul instrument que l'on porte déjà en soi.", a: 'Sagesse musicale' },
  { t: "Un silence, en musique, se joue aussi.", a: 'Sagesse musicale' },
  { t: "Le métronome ne ment jamais — c'est bien pour ça qu'il est utile.", a: 'Sagesse musicale' },
  { t: "On n'accorde pas sa guitare une fois pour toutes.", a: 'Sagesse musicale' },
  { t: "La musique commence là où s'arrêtent les mots.", a: 'Heinrich Heine' },
  { t: "Chanter faux avec cœur vaut mieux que chanter juste sans âme.", a: 'Sagesse musicale' },
  { t: "Un bon riff se souvient de lui-même.", a: 'Sagesse musicale' },
  { t: "La gamme, c'est la grammaire ; l'improvisation, c'est la poésie.", a: 'Sagesse musicale' },
  { t: "On ne maîtrise jamais un instrument, on apprend juste à mieux l'écouter.", a: 'Sagesse musicale' },

  // — Créativité & art —
  { t: "Chaque enfant est un artiste. Le problème, c'est de le rester en grandissant.", a: 'Pablo Picasso' },
  { t: "L'art lave notre âme de la poussière du quotidien.", a: 'Pablo Picasso' },
  { t: "La simplicité est la sophistication suprême.", a: 'Léonard de Vinci' },
  { t: "L'imagination est plus importante que le savoir.", a: 'Albert Einstein' },
  { t: "Créer, c'est résister ; résister, c'est créer.", a: 'Stéphane Hessel' },
  { t: "Tout ce que l'on peut imaginer est réel.", a: 'Pablo Picasso' },

  // — Sagesse générale (suite) —
  { t: "Deviens celui que tu es.", a: 'Pindare' },
  { t: "Le sage ne dit pas tout ce qu'il pense, mais il pense tout ce qu'il dit.", a: 'Aristote' },
  { t: "La vraie sagesse est de reconnaître sa propre ignorance.", a: 'Socrate' },
  { t: "On ne se baigne jamais deux fois dans le même fleuve.", a: 'Héraclite' },
  { t: "Ce que tu ne veux pas qu'on te fasse, ne le fais pas aux autres.", a: 'Confucius' },
  { t: "Choisis un travail que tu aimes, et tu n'auras pas à travailler un seul jour.", a: 'Confucius' },
  { t: "Peu importe la lenteur, tant que tu ne t'arrêtes pas.", a: 'Confucius' },
  { t: "La différence entre l'ordinaire et l'extraordinaire, c'est ce petit supplément d'attention.", a: 'Jimmy Johnson' },
  { t: "Sois le changement que tu veux voir dans le monde.", a: 'Gandhi' },
  { t: "La force ne vient pas de la capacité physique, mais d'une volonté indomptable.", a: 'Gandhi' },
  { t: "Vis comme si tu devais mourir demain, apprends comme si tu devais vivre toujours.", a: 'Gandhi' },
  { t: "Le futur dépend de ce que l'on fait au présent.", a: 'Gandhi' },
  { t: "Tout ce qui est simple est faux, tout ce qui est compliqué est inutilisable.", a: 'Paul Valéry' },
  { t: "Douter de tout ou tout croire sont deux solutions également commodes.", a: 'Henri Poincaré' },
  { t: "Il n'y a pas de hasard, il n'y a que des rendez-vous.", a: 'Paul Éluard' },
  { t: "La vie est un mystère qu'il faut vivre, et non un problème à résoudre.", a: 'Gandhi' },
  { t: "On ne voit jamais ce qui a été fait, on ne voit que ce qui reste à faire.", a: 'Marie Curie' },
  { t: "Rien dans la vie n'est à craindre, tout est à comprendre.", a: 'Marie Curie' },
  { t: "L'homme sage n'est jamais moins seul que quand il est seul.", a: 'Jonathan Swift' },
  { t: "Le voyage de mille lieues commence toujours par un premier pas.", a: 'Lao Tseu' },
  { t: "Celui qui maîtrise les autres est fort ; celui qui se maîtrise lui-même est puissant.", a: 'Lao Tseu' },
  { t: "Un bon voyageur n'a pas de plan fixe, et n'a pas l'intention d'arriver.", a: 'Lao Tseu' },
  { t: "La nature n'a pas de gabarit fixe et pourtant rien ne manque.", a: 'Lao Tseu' },

  // — Temps, patience, quotidien —
  { t: "Le temps que l'on aime perdre n'est jamais du temps perdu.", a: 'Proverbe' },
  { t: "Chaque chose en son temps, et un temps pour chaque chose.", a: 'Proverbe' },
  { t: "Demain sera un autre jour, mais aujourd'hui compte déjà.", a: 'Sagesse du quotidien' },
  { t: "Le temps ne se rattrape pas, il se savoure.", a: 'Sagesse du quotidien' },
  { t: "Une minute de patience, dix ans de tranquillité.", a: 'Proverbe' },
  { t: "Il faut du temps au temps.", a: 'Proverbe espagnol' },
  { t: "Ce que l'on remet à demain s'accumule, jamais ne s'efface.", a: 'Sagesse du quotidien' },
  { t: "La régularité bat l'intensité sur la durée.", a: 'Sagesse du quotidien' },
  { t: "Les petites habitudes façonnent les grandes vies.", a: 'Sagesse du quotidien' },
  { t: "On ne construit rien de solide dans la précipitation.", a: 'Proverbe' },

  // — Voyage, découverte, curiosité —
  { t: "Le monde est un livre, et ceux qui ne voyagent pas n'en lisent qu'une page.", a: 'Saint Augustin' },
  { t: "On ne découvre jamais de terre nouvelle sans consentir à perdre de vue le rivage.", a: 'André Gide' },
  { t: "La curiosité est le plus sûr moteur de l'intelligence.", a: 'Sagesse du quotidien' },
  { t: "Toute connaissance commence par l'étonnement.", a: 'Aristote' },
  { t: "Il n'y a pas de mauvaise route pour celui qui sait où il veut arriver.", a: 'Proverbe' },
  { t: "Apprendre, c'est découvrir que quelque chose est possible.", a: 'Fritz Perls' },

  // — Famille, amitié, humanité (suite) —
  { t: "La maison, c'est là où le cœur se pose.", a: 'Proverbe' },
  { t: "On ne choisit pas sa famille, mais on choisit d'en prendre soin.", a: 'Sagesse du quotidien' },
  { t: "Un foyer chaleureux vaut tous les palais.", a: 'Proverbe' },
  { t: "La solitude choisie ressource ; la solitude subie épuise.", a: 'Sagesse du quotidien' },
  { t: "Rire ensemble, c'est déjà se comprendre à moitié.", a: 'Sagesse du quotidien' },
  { t: "Un foyer sans rires n'est qu'une maison.", a: 'Proverbe' },
  { t: "L'écoute est le plus beau cadeau que l'on puisse offrir.", a: 'Sagesse du quotidien' },

  // — Nature, saisons, jardin (suite) —
  { t: "Il n'est pire aveugle que celui qui ne veut pas voir pousser son jardin.", a: 'Proverbe' },
  { t: "Chaque graine porte en elle une forêt entière.", a: 'Proverbe' },
  { t: "La terre ne ment jamais à qui prend soin d'elle.", a: 'Proverbe' },
  { t: "Le vent qui abat les grands chênes épargne souvent les roseaux.", a: 'Jean de La Fontaine' },
  { t: "Rien ne sert de courir, il faut partir à point.", a: 'Jean de La Fontaine' },
  { t: "Un jardin bien tenu se voit aussi les jours de pluie.", a: 'Proverbe' },
  { t: "L'automne est le second printemps, où chaque feuille est une fleur.", a: 'Albert Camus' },
  { t: "Au milieu de l'hiver, j'ai découvert en moi un invincible été.", a: 'Albert Camus' },

  // — Météo, lune, ciel —
  { t: "Même la pluie la plus longue finit par sécher.", a: 'Proverbe' },
  { t: "La lune ne se compare jamais au soleil, elle brille de sa propre lumière.", a: 'Sagesse du quotidien' },
  { t: "Regarder les étoiles rappelle que nos soucis sont petits.", a: 'Sagesse du quotidien' },
  { t: "Un ciel changeant annonce souvent un beau lendemain.", a: 'Proverbe' },
  { t: "Chaque phase de la lune a sa propre sagesse : croître, briller, se reposer.", a: 'Sagesse du quotidien' },

  // — Motivation, action (suite) —
  { t: "On n'échoue vraiment que lorsqu'on cesse d'essayer.", a: 'Sagesse du quotidien' },
  { t: "Le succès, c'est aller d'échec en échec sans perdre son enthousiasme.", a: 'Winston Churchill' },
  { t: "Il n'est jamais trop tard pour devenir ce que l'on aurait pu être.", a: 'George Eliot' },
  { t: "Les grandes réalisations sont faites d'une multitude de petits pas.", a: 'Sagesse du quotidien' },
  { t: "Un objectif sans plan n'est qu'un souhait.", a: 'Antoine de Saint-Exupéry' },
  { t: "Le courage, ce n'est pas l'absence de peur, mais la décision d'avancer malgré elle.", a: 'Nelson Mandela' },
  { t: "Ça semble toujours impossible, jusqu'à ce que ce soit fait.", a: 'Nelson Mandela' },
  { t: "La vie, c'est 10% ce qui nous arrive, et 90% comment on y réagit.", a: 'Charles R. Swindoll' },
  { t: "Fais de ton mieux jusqu'à ce que tu saches mieux faire. Alors, fais mieux.", a: 'Maya Angelou' },
  { t: "On ne perd jamais, soit on gagne, soit on apprend.", a: 'Sagesse du quotidien' },

  // — Bien-être, calme, gratitude (suite) —
  { t: "Le bonheur n'est pas une destination, c'est une façon de voyager.", a: 'Sagesse du quotidien' },
  { t: "Sourire à la vie, c'est déjà l'inviter à sourire en retour.", a: 'Proverbe' },
  { t: "Le présent est le seul moment que l'on possède vraiment.", a: 'Thích Nhất Hạnh' },
  { t: "La paix vient de l'intérieur, ne la cherche pas dehors.", a: 'Bouddha' },
  { t: "Ce que tu penses, tu le deviens ; ce que tu ressens, tu l'attires.", a: 'Bouddha' },
  { t: "Chaque respiration consciente est un petit retour à la maison.", a: 'Sagesse du quotidien' },
  { t: "La gratitude convertit ce que l'on a en ce qui est suffisant.", a: 'Sagesse du quotidien' },
  { t: "Prendre soin de soi n'est pas un luxe, c'est une nécessité.", a: 'Sagesse du quotidien' },
  { t: "Un esprit calme est le meilleur allié de la clarté.", a: 'Sagesse du quotidien' },
  { t: "Ralentir n'est pas reculer, c'est mieux avancer.", a: 'Sagesse du quotidien' },

  // — Organisation, agenda (suite) —
  { t: "Une tâche bien planifiée est déjà à moitié faite.", a: 'Proverbe' },
  { t: "Ce qui se mesure s'améliore.", a: 'Peter Drucker' },
  { t: "Le meilleur moyen de prédire l'avenir, c'est de le préparer.", a: 'Abraham Lincoln' },
  { t: "Un agenda vide n'a jamais rien accompli, un agenda encombré non plus.", a: 'Sagesse du quotidien' },
  { t: "Priorise ce qui compte avant de remplir ce qui presse.", a: 'Sagesse du quotidien' },

  // — Simplicité, sobriété, technologie —
  { t: "La vraie richesse, c'est de se contenter de peu.", a: 'Épicure' },
  { t: "Moins, mais mieux.", a: 'Dieter Rams' },
  { t: "Un outil n'est utile que s'il sert la vie, pas l'inverse.", a: 'Sagesse du quotidien' },
  { t: "Le silence numérique, parfois, en dit plus que mille notifications.", a: 'Sagesse du quotidien' },
  { t: "La simplicité est la dernière étape de l'art, pas la première.", a: 'Frédéric Chopin' },

  // — Cuisine (suite) —
  { t: "Une bonne soupe fait plus pour la santé que dix médicaments.", a: 'Proverbe' },
  { t: "On cuisine avec les mains, mais on nourrit avec le cœur.", a: 'Sagesse du quotidien' },
  { t: "Les épices ne remplacent jamais la patience.", a: 'Sagesse du quotidien' },
  { t: "Un repas partagé nourrit deux fois : le corps et le lien.", a: 'Sagesse du quotidien' },

  // — Sport, santé (suite) —
  { t: "Le corps atteint ce que l'esprit croit possible.", a: 'Sagesse du quotidien' },
  { t: "Le sommeil est la meilleure méditation.", a: 'Dalaï Lama' },
  { t: "On ne rattrape jamais une nuit de sommeil perdue, on l'accepte et on repart.", a: 'Sagesse du quotidien' },
  { t: "Le sport ne rend pas seulement le corps fort, il rend l'esprit clair.", a: 'Sagesse du quotidien' },
  { t: "Le meilleur exercice est celui que l'on fait vraiment.", a: 'Sagesse du quotidien' },

];

/**
 * Numéro du jour dans l'année (1 à 365/366) — sert de graine stable pour
 * que le dicton reste identique toute la journée, mais change chaque jour.
 */
function jourDeLAnnee(date) {
  const debutAnnee = new Date(date.getFullYear(), 0, 0);
  const diffMs = date - debutAnnee;
  return Math.floor(diffMs / 86400000);
}

/**
 * Petit hash déterministe (FNV-like) — sert à "mélanger" l'ordre des
 * dictons de façon stable mais peu prévisible, plutôt qu'un simple
 * `jourDeLAnnee % longueur` qui donnerait EXACTEMENT le même dicton le
 * même jour calendaire chaque année (ex: toujours le même dicton le
 * 14 juillet, année après année). En mélangeant avec l'année, l'ordre
 * change d'une année sur l'autre tout en restant stable au sein d'une
 * même journée.
 */
function hashJour(texte) {
  let hash = 2166136261;
  for (let i = 0; i < texte.length; i++) {
    hash ^= texte.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/**
 * Retourne le dicton du jour, identique partout dans l'app (accueil, widget)
 * pour une même date. `dateReference` est optionnel, utile pour les tests.
 */
export function getDictonDuJour(dateReference = new Date()) {
  const graine = `${dateReference.getFullYear()}-${jourDeLAnnee(dateReference)}`;
  const index = hashJour(graine) % DICTONS.length;
  return DICTONS[index];
}
