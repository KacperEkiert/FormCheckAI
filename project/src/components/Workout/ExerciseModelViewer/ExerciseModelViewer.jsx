import React, { Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

const Model = ({ path }) => {
  const fbx = useLoader(FBXLoader, path);
  const mixer = useRef();

  useEffect(() => {
    if (fbx && fbx.animations.length > 0) {
      mixer.current = new THREE.AnimationMixer(fbx);
      const action = mixer.current.clipAction(fbx.animations[0]);
      action.play();
    }
    fbx.scale.setScalar(0.01);
    
    // Ustawienie modelu: -1.2 sprawi, że będzie idealnie na środku okna podglądu
    fbx.position.set(0, -1.2, 0); 
  }, [fbx]);

  useFrame((state, delta) => {
    if (mixer.current) mixer.current.update(delta);
  });

  return <primitive object={fbx} dispose={null} />;
};

const ExerciseModelViewer = ({ modelPath }) => {
  if (!modelPath) return null;

  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas camera={{ position: [0, 1, 3.8], fov: 40 }}>
        {/* Kontrolki obracania */}
        <OrbitControls 
          enableZoom={true} 
          enablePan={false} 
          minDistance={2} 
          maxDistance={8} 
        />
        
        {/* Oświetlenie Ultra Bright */}
        <ambientLight intensity={2.5} />
        <pointLight position={[10, 15, 10]} intensity={6.5} />
        <pointLight position={[-10, 15, -10]} intensity={4.5} />
        
        <directionalLight position={[5, 10, 5]} intensity={8.5} />
        <directionalLight position={[-5, 10, -5]} intensity={5.5} />
        <directionalLight position={[0, -5, 0]} intensity={4.5} />
        <directionalLight position={[0, 5, 15]} intensity={5.0} />

        {/* Cień pod modelem */}
        <ContactShadows 
          position={[0, -1.2, 0]} 
          opacity={0.6} 
          scale={10} 
          blur={2.5} 
          far={1.5} 
        />
        
        <Suspense fallback={null}>
          <Model path={modelPath} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default ExerciseModelViewer;