import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera, Text, Line } from '@react-three/drei';
import * as THREE from 'three';

// Data structure passed from App
export interface VisibleFrameData {
  matrix: THREE.Matrix4;
  globalIndex: number;
  type: 'initial' | 'previous' | 'current';
}

interface SceneProps {
  frames: VisibleFrameData[];
}

// Custom component to render Label + Subscript manually for perfect alignment
const AxisLabel: React.FC<{
  position: THREE.Vector3;
  color: string;
  axisChar: string;
  index: number;
}> = ({ position, color, axisChar, index }) => {
  return (
    <group position={position}>
       {/* Main Character (e.g., X, Y, Z) */}
       <Text
         position={[0, 0, 0]}
         fontSize={0.25}
         color={color}
         anchorX="right" // Align to right so subscript starts immediately after
         anchorY="middle"
       >
         {axisChar}
       </Text>
       {/* Subscript Number */}
       <Text
         position={[0.02, -0.08, 0]} // Shift slightly right and down
         fontSize={0.15}
         color={color}
         anchorX="left"
         anchorY="middle"
       >
         {index.toString()}
       </Text>
    </group>
  );
};

const FrameAxis: React.FC<{ 
  dir: THREE.Vector3, 
  color: string, 
  axisChar: string,
  index: number,
  length?: number 
}> = ({ dir, color, axisChar, index, length = 1.5 }) => {
  const textPos = dir.clone().multiplyScalar(length + 0.2);
  
  return (
    <group>
      <arrowHelper args={[dir, new THREE.Vector3(0,0,0), length, color, 0.2, 0.1]} />
      <AxisLabel position={textPos} color={color} axisChar={axisChar} index={index} />
    </group>
  );
};

const CoordinateFrame: React.FC<{ 
  data: VisibleFrameData;
}> = ({ data }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  const { matrix, globalIndex, type } = data;
  
  // Visual style based on type
  const isCurrent = type === 'current' || type === 'initial';
  // Current frame is solid Amber/RGB. Previous is ghosted Slate/Desaturated.
  const originColor = isCurrent ? (type === 'initial' ? '#ffffff' : '#fbbf24') : '#94a3b8';
  const opacity = isCurrent ? 1 : 0.4;
  const scale = isCurrent ? 1 : 0.9;
  
  // Axis colors
  const xColor = isCurrent ? "#ff0000" : "#ff9999";
  const yColor = isCurrent ? "#00ff00" : "#99ff99";
  const zColor = isCurrent ? "#0000ff" : "#9999ff";

  useFrame(() => {
    if (groupRef.current) {
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const s = new THREE.Vector3();
      matrix.decompose(pos, quat, s);
      groupRef.current.position.copy(pos);
      groupRef.current.quaternion.copy(quat);
    }
  });

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      {/* Origin Sphere */}
      <mesh>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color={originColor} transparent opacity={opacity} />
      </mesh>
      
      {/* Axes */}
      <FrameAxis dir={new THREE.Vector3(1,0,0)} color={xColor} axisChar="x" index={globalIndex} length={1.5} />
      <FrameAxis dir={new THREE.Vector3(0,1,0)} color={yColor} axisChar="y" index={globalIndex} length={1.5} />
      <FrameAxis dir={new THREE.Vector3(0,0,1)} color={zColor} axisChar="z" index={globalIndex} length={1.5} />
      
      {/* Origin Label */}
      <AxisLabel 
        position={new THREE.Vector3(0.2, 0.2, 0.2)} 
        color={originColor} 
        axisChar="O" 
        index={globalIndex} 
      />
    </group>
  );
};

const TrajectoryLine: React.FC<{ frames: VisibleFrameData[] }> = ({ frames }) => {
  const points = useMemo(() => {
    return frames.map(f => {
      const pos = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const s = new THREE.Vector3();
      f.matrix.decompose(pos, q, s);
      return pos;
    });
  }, [frames]);

  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      color="#fbbf24"
      opacity={0.5}
      transparent
      dashed
      dashSize={0.2}
      gapSize={0.1}
      lineWidth={1}
    />
  );
};

export const Scene: React.FC<SceneProps> = ({ frames }) => {
  return (
    <div className="w-full h-full bg-slate-900 rounded-xl overflow-hidden shadow-inner shadow-black/50 border border-slate-700">
      <Canvas>
        {/* 
          Camera Setup:
          Position [8, 8, 8] with Up [0,0,1] creates a Standard Isometric-like view.
          In this configuration:
          - X axis (Red) projects to Bottom-Left
          - Y axis (Green) projects to Bottom-Right
          - Z axis (Blue) projects Up
          This satisfies the requirement: "X a sinistra, Y a destra, Z verso l'alto".
        */}
        <PerspectiveCamera makeDefault position={[8, 8, 8]} up={[0, 0, 1]} fov={45} />
        
        <OrbitControls 
          enableRotate={false} 
          enableZoom={true} 
          enablePan={true}
          makeDefault 
          target={[0, 0, 0]}
        />
        
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, 10]} intensity={0.5} />

        {/* 
          Grid aligned to XY plane (the "floor" in Z-up).
          drei/Grid defaults to XZ plane, so we rotate it 90deg on X to lay flat on XY.
        */}
        <Grid 
          infiniteGrid 
          fadeDistance={25} 
          sectionColor="#334155" 
          cellColor="#1e293b" 
          position={[0, 0, -0.01]} 
          rotation={[Math.PI / 2, 0, 0]} 
        />

        {frames.map((frameData) => (
          <CoordinateFrame 
            key={frameData.globalIndex} 
            data={frameData}
          />
        ))}

        <TrajectoryLine frames={frames} />

      </Canvas>
    </div>
  );
};