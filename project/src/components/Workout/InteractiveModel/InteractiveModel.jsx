import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGLTF, PresentationControls, Stage, Html } from '@react-three/drei'

function Model({ onPartClick, selectedCategory }) {
  const { nodes } = useGLTF('/human_model.glb')
  const [hovered, setHovered] = React.useState(null);

  const nameMap = {
    "Klata": "KLATKA",
    "Uda": "NOGI",
    "Barki":"BARKI",
    "lydki": "NOGI",
    "Biceps": "BICEPS",
    "Przedramie": "PRZEDRAMIE",
    "Triceps": "TRICEPS",
    "Góra_pleców": "PLECY",
    "Mięsień_najszerszy_grzbietu": "PLECY",
    "Boki_brzucha": "CORE",
    "Brzuch": "CORE"
  };

  if (!nodes) return null;

  return (
    <group dispose={null} rotation={[-Math.PI / 2, 0, 0]} scale={1}>
      {Object.keys(nodes).map((name) => {
        const obj = nodes[name];
        if (obj.type !== 'Mesh') return null;

        const mappedCategory = nameMap[name];
        const isSelectable = !!mappedCategory;
        const isHighlighted = selectedCategory === mappedCategory;
        const isHovered = hovered === name;

        return (
          <mesh
            key={name}
            geometry={obj.geometry}
            onPointerOver={(e) => { e.stopPropagation(); if(isSelectable) setHovered(name); }}
            onPointerOut={() => setHovered(null)}
            onClick={(e) => {
              e.stopPropagation(); 
              if (isSelectable) {
                onPartClick(mappedCategory); 
              }
            }}
          >
            <meshStandardMaterial 
              color={isHighlighted ? "#38bdf8" : (isHovered ? "#7dd3fc" : "#1e293b")}
              emissive={isHighlighted ? "#38bdf8" : (isHovered ? "#0ea5e9" : "#000000")}
              emissiveIntensity={isHighlighted ? 0.5 : (isHovered ? 0.3 : 0)}
              roughness={0.3}
              metalness={0.8}
              transparent={false}
            />
          </mesh>
        );
      })}
    </group>
  )
}

export default function InteractiveModel({ onSelect, currentCategory }) {
  return (
    <div className="w-full h-full bg-slate-950 rounded-2xl border-4 border-slate-700 overflow-hidden shadow-2xl relative">
      <div className="absolute top-4 left-4 z-50 pointer-events-none">
        <span className="text-[10px] font-black bg-sky-500 text-slate-950 px-2 py-1 rounded uppercase italic">
          Atlas Mięśni 3D
        </span>
      </div>
      
      <Canvas 
        dpr={[1, 2]} 
        camera={{ fov: 45, position: [0, 0, 5] }}
        style={{ touchAction: 'none' }} 
      >
        <color attach="background" args={['#020617']} />
        
        <Suspense fallback={<Html center className="text-sky-500 font-mono text-[10px]">ŁADOWANIE...</Html>}>
          <ambientLight intensity={1.5} /> 
          <pointLight position={[10, 10, 10]} intensity={2} />
          
          <PresentationControls 
            speed={1.5} 
            global 
            zoom={1}
            polar={[-0.1, Math.PI / 4]}
            config={{ mass: 1, tension: 170, friction: 26 }} 
          >
            <Stage environment="city" intensity={0.5} contactShadow={false} adjustCamera={true}>
              <Model onPartClick={onSelect} selectedCategory={currentCategory} />
            </Stage>
          </PresentationControls>
        </Suspense>
      </Canvas>
    </div>
  )
}
