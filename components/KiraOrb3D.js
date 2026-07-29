// KIRAORB3D.JS — LOT 63
// Vraie sphère 3D pour l'icône Kira : relief, lumière et orbite calculés
// en temps réel par un moteur de rendu (three.js), au lieu d'être simulés
// en SVG plat (contrairement à KiraIcon.js, lot 62).
//
// ⚠️ EXPÉRIMENTAL — nécessite un rebuild natif (expo-gl) et n'a pas encore
// été testé sur un vrai appareil. Contrôlé par un interrupteur désactivé
// par défaut dans Paramètres → 🌟 Kira ("🔮 Rendu 3D (expérimental)").
//
// ⚠️ Point technique à vérifier au premier test : la transparence du fond
// derrière la sphère peut être limitée sur certains GPU/pilotes Android
// avec expo-gl. Si un carré sombre apparaît derrière l'orbe au lieu d'un
// fond transparent, il suffit de changer la couleur de fond ci-dessous
// (voir le commentaire "COULEUR DE FOND" plus bas) pour qu'elle corresponde
// au fond de l'écran où l'icône est affichée, plutôt que d'essayer une
// vraie transparence.

import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';

export default function KiraOrb3D({ size = 44, color = '#6C63FF' }) {
  const frameIdRef = useRef(null);
  const glRef = useRef(null);

  useEffect(() => {
    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    };
  }, []);

  const onContextCreate = async gl => {
    glRef.current = gl;
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);

    // COULEUR DE FOND : 0x000000 avec alpha 0 = tentative de fond
    // transparent. Si ça affiche un carré noir sur ton appareil, remplace
    // le "0" final par la couleur de fond de l'écran (ex: 0x07070e pour
    // le thème Cosmos) et retire le ", 0" pour un fond opaque assorti.
    renderer.setClearColor(0x000000, 0);

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
    };

    boucle();
  };

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <GLView style={{ width: size, height: size }} onContextCreate={onContextCreate} />
    </View>
  );
}
