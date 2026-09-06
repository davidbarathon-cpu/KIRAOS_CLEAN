// KIRAORB3D.JS — LOT 63, corrigé au LOT 72
// Vraie sphère 3D pour l'icône Kira : relief, lumière et orbite calculés
// en temps réel par un moteur de rendu (three.js), au lieu d'être simulés
// en SVG plat (contrairement à KiraIcon.js, lot 62).
//
// CORRECTIF LOT 72 : David a signalé que l'icône disparaît complètement
// dès qu'il active le rendu 3D (au lieu d'un carré sombre anticipé au lot
// 63). Deux changements pour y remédier, sans certitude absolue sans log
// natif pour confirmer la cause exacte (voir procédure adb logcat déjà
// utilisée pour le plantage Health Connect si le problème persiste) :
//   1. Le fond transparent (alpha 0) demandé au moteur de rendu peut, sur
//      certains GPU/pilotes Android avec expo-gl, faire disparaître TOUT
//      le contenu du calque au lieu de seulement le fond — la sphère elle-
//      même devenait invisible, pas juste son arrière-plan. Remplacé par
//      un fond opaque assorti au thème (passé en prop, cosmos par défaut).
//   2. Toute la création de scène est maintenant protégée par un
//      try/catch : en cas d'échec (module natif mal lié, erreur de rendu),
//      un callback onErreur() est appelé pour que KiraIcon.js puisse
//      afficher l'icône 2D habituelle plutôt que rien du tout.

import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

export default function KiraOrb3D({ size = 44, color = '#6C63FF', backgroundColor = '#07070e', onErreur }) {
  const frameIdRef = useRef(null);
  const glRef = useRef(null);

  useEffect(() => {
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    };
  }, []);

  const onContextCreate = async gl => {
    try {
      glRef.current = gl;
      const renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);

      // Fond opaque assorti au thème plutôt qu'une transparence qui peut,
      // selon le GPU/pilote, faire disparaître la sphère elle-même en même
      // temps que son arrière-plan (voir note de correctif ci-dessus).
      renderer.setClearColor(new THREE.Color(backgroundColor).getHex(), 1);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(45, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
      camera.position.z = 3.1;

      const couleurThree = new THREE.Color(color);

      // ── Éclairage ──
      const ambiante = new THREE.AmbientLight(0xffffff, 0.45);
      scene.add(ambiante);

      // Lumière ponctuelle mobile — équivalent 3D du "reflet mobile" du lot 62,
      // mais ici la lumière est réellement calculée sur le relief de la sphère.
      const lumiereMobile = new THREE.PointLight(0xffffff, 2.2, 12);
      lumiereMobile.position.set(1.5, 1.5, 2);
      scene.add(lumiereMobile);

      // Deuxième lumière teintée pour renforcer l'ambiance cristalline
      const lumiereTeintee = new THREE.PointLight(couleurThree, 1.1, 10);
      lumiereTeintee.position.set(-2, -1, 1.5);
      scene.add(lumiereTeintee);

      // ── Orbe principal ──
      const geometrieOrbe = new THREE.SphereGeometry(1, 48, 48);
      const materiauOrbe = new THREE.MeshPhysicalMaterial({
        color: couleurThree,
        metalness: 0.1,
        roughness: 0.25,
        clearcoat: 1,
        clearcoatRoughness: 0.15,
        emissive: couleurThree,
        emissiveIntensity: 0.18,
      });
      const orbe = new THREE.Mesh(geometrieOrbe, materiauOrbe);
      scene.add(orbe);

      // ── Anneau fin qui encercle l'orbe (équivalent 3D de l'anneau d'énergie) ──
      const anneauGeo = new THREE.TorusGeometry(1.25, 0.015, 8, 64);
      const anneauMat = new THREE.MeshBasicMaterial({ color: couleurThree, transparent: true, opacity: 0.5 });
      const anneau = new THREE.Mesh(anneauGeo, anneauMat);
      anneau.rotation.x = Math.PI / 2.4;
      scene.add(anneau);

      // ── Deux particules en orbite (groupes pivots, comme au lot 62) ──
      const particule1 = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee })
      );
      particule1.position.set(1.5, 0, 0);
      const orbite1 = new THREE.Object3D();
      orbite1.add(particule1);
      scene.add(orbite1);

      const particule2 = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xffd700 })
      );
      particule2.position.set(0, -1.5, 0.4);
      const orbite2 = new THREE.Object3D();
      orbite2.add(particule2);
      scene.add(orbite2);

      const boucle = () => {
        try {
          frameIdRef.current = requestAnimationFrame(boucle);

          const t = Date.now() * 0.001;

          orbe.rotation.y += 0.006;
          orbe.rotation.x += 0.002;
          anneau.rotation.z += 0.01;
          orbite1.rotation.y += 0.022;
          orbite2.rotation.x += 0.015;

          // Lumière qui se déplace réellement autour de la sphère
          lumiereMobile.position.x = Math.sin(t * 0.6) * 2.2;
          lumiereMobile.position.y = Math.cos(t * 0.5) * 2.2;

          renderer.render(scene, camera);
          gl.endFrameEXP();
        } catch (e) {
          console.warn('[KiraOrb3D] Erreur pendant la boucle de rendu :', e.message);
          if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
          onErreur?.(e);
        }
      };

      boucle();
    } catch (e) {
      // Visible via : adb logcat | grep ReactNativeJS (ou le fichier crash.log
      // habituel) — dis-le-moi si ce message apparaît, ça confirmera la cause
      // exacte plutôt que l'hypothèse retenue ici.
      console.warn('[KiraOrb3D] Échec de création du contexte 3D :', e.message);
      onErreur?.(e);
    }
  };

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <GLView style={{ width: size, height: size }} onContextCreate={onContextCreate} />
    </View>
  );
}
