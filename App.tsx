import React, { useState, useEffect, useMemo } from 'react';
import { Matrix4, Vector3, Quaternion, Euler, MathUtils } from 'three';
import { Plus, RotateCw, Move3d, Undo2, Trash2, ArrowRightLeft, Calculator, Info, Eye, EyeOff } from 'lucide-react';
import { Scene, VisibleFrameData } from './components/Scene';
import { MatrixDisplay } from './components/MatrixDisplay';
import { TransformationStep, Axis, FrameType, OperationType } from './types';

// Constants
const AXIS_VECTORS: Record<Axis, Vector3> = {
  x: new Vector3(1, 0, 0),
  y: new Vector3(0, 1, 0),
  z: new Vector3(0, 0, 1),
};

const App: React.FC = () => {
  // State
  const [steps, setSteps] = useState<TransformationStep[]>([]);
  
  // Visibility State
  const [showPrevious, setShowPrevious] = useState<boolean>(true);
  const [showCurrent, setShowCurrent] = useState<boolean>(true);
  
  // Input State
  const [opType, setOpType] = useState<OperationType>('rotation');
  const [axis, setAxis] = useState<Axis>('x');
  const [frame, setFrame] = useState<FrameType>('mobile');
  const [value, setValue] = useState<number>(90); // Default 90 deg or 1 unit

  // Derived State: Current Matrix & History
  const { currentMatrix, visibleFrames } = useMemo(() => {
    const history = [new Matrix4()]; // Start with Identity (Frame 0)
    
    steps.forEach(step => {
       history.push(step.cumulativeMatrix);
    });

    const fullList = history;
    const currentMat = history[history.length - 1];

    // Determine potential frames
    let potentialFrames: VisibleFrameData[] = [];

    if (fullList.length === 1) {
      potentialFrames = [{ matrix: fullList[0], globalIndex: 0, type: 'initial' }];
    } else {
      const lastIndex = fullList.length - 1;
      potentialFrames = [
        { matrix: fullList[lastIndex - 1], globalIndex: lastIndex - 1, type: 'previous' },
        { matrix: fullList[lastIndex], globalIndex: lastIndex, type: 'current' }
      ];
    }

    // Filter based on visibility toggles
    const filteredFrames = potentialFrames.filter(f => {
      // If it's the very first initial frame (no steps yet), we treat it as "Current" for visibility logic
      if (f.type === 'initial') return showCurrent;
      if (f.type === 'previous') return showPrevious;
      if (f.type === 'current') return showCurrent;
      return true;
    });

    return {
      currentMatrix: currentMat,
      visibleFrames: filteredFrames
    };
  }, [steps, showPrevious, showCurrent]);

  // Modal State
  const [showResult, setShowResult] = useState<'none' | 'final' | 'inverse'>('none');

  const handleAddStep = () => {
    const newStepMatrix = new Matrix4();

    // 1. Calculate the Transformation Matrix for THIS step
    if (opType === 'rotation') {
      const radians = MathUtils.degToRad(value);
      if (axis === 'x') newStepMatrix.makeRotationX(radians);
      if (axis === 'y') newStepMatrix.makeRotationY(radians);
      if (axis === 'z') newStepMatrix.makeRotationZ(radians);
    } else {
      if (axis === 'x') newStepMatrix.makeTranslation(value, 0, 0);
      if (axis === 'y') newStepMatrix.makeTranslation(0, value, 0);
      if (axis === 'z') newStepMatrix.makeTranslation(0, 0, value);
    }

    // 2. Calculate Cumulative Matrix
    const prevMatrix = steps.length > 0 ? steps[steps.length - 1].cumulativeMatrix.clone() : new Matrix4();
    const newCumulative = prevMatrix.clone();

    if (frame === 'mobile') {
      // Post-multiply for Mobile/Local frame
      newCumulative.multiply(newStepMatrix);
    } else {
      // Pre-multiply for Fixed/World frame
      newCumulative.premultiply(newStepMatrix);
    }

    const newStep: TransformationStep = {
      id: Math.random().toString(36).substr(2, 9),
      type: opType,
      axis,
      value,
      frame,
      stepMatrix: newStepMatrix,
      cumulativeMatrix: newCumulative,
    };

    setSteps([...steps, newStep]);
  };

  const handleUndo = () => {
    setSteps(prev => prev.slice(0, -1));
  };

  const handleReset = () => {
    setSteps([]);
  };

  const toggleSign = () => {
    setValue(prev => -prev);
  };

  const getInverseMatrix = () => {
    const inv = currentMatrix.clone().invert();
    return inv;
  };

  return (
    <div className="flex flex-col h-full md:flex-row max-w-7xl mx-auto overflow-hidden">
      
      {/* Left / Top Panel: 3D Workspace */}
      <div className="relative w-full h-[45vh] md:h-full md:w-1/2 lg:w-3/5 p-4 flex flex-col">
         <header className="mb-2 flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Move3d className="w-6 h-6 text-blue-400" /> 
                RotoTranslaViz
              </h1>
              <p className="text-xs text-slate-400">Fixed & Mobile Frame Visualizer</p>
            </div>
            <div className="flex gap-2">
               {steps.length > 0 && (
                 <button onClick={handleReset} className="p-2 hover:bg-red-900/50 text-red-400 rounded transition-colors" title="Reset All">
                    <Trash2 size={18} />
                 </button>
               )}
            </div>
         </header>
         
         <div className="flex-grow relative">
            {/* Pass structured frames instead of raw history */}
            <Scene frames={visibleFrames} />
            
            {/* Legend / Toggles */}
            <div className="absolute top-4 left-4 z-10">
              <div className="bg-slate-900/90 backdrop-blur px-3 py-2 rounded-lg border border-slate-700 text-xs text-slate-300 shadow-xl">
                <div className="font-bold mb-2 border-b border-slate-700 pb-1 text-slate-400">Visibility</div>
                
                {/* Previous Toggle */}
                <button 
                  onClick={() => setShowPrevious(!showPrevious)}
                  className="flex items-center justify-between w-full gap-3 mb-2 hover:bg-slate-800 p-1 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                     <span className={`w-2 h-2 rounded-full border ${showPrevious ? 'bg-slate-400/50 border-slate-500' : 'bg-transparent border-slate-600'}`}></span> 
                     <span className={!showPrevious ? 'text-slate-500 line-through' : ''}>Previous</span>
                  </div>
                  {showPrevious ? <Eye size={14} className="text-slate-400" /> : <EyeOff size={14} className="text-slate-600" />}
                </button>

                {/* Current Toggle */}
                <button 
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="flex items-center justify-between w-full gap-3 hover:bg-slate-800 p-1 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                     <span className={`w-2 h-2 rounded-full border ${showCurrent ? 'bg-amber-400 border-amber-500' : 'bg-transparent border-slate-600'}`}></span> 
                     <span className={!showCurrent ? 'text-slate-500 line-through' : ''}>Current</span>
                  </div>
                  {showCurrent ? <Eye size={14} className="text-slate-400" /> : <EyeOff size={14} className="text-slate-600" />}
                </button>
              </div>
            </div>
         </div>
      </div>

      {/* Right / Bottom Panel: Controls & History */}
      <div className="w-full h-[55vh] md:h-full md:w-1/2 lg:w-2/5 bg-slate-900/50 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col">
        
        {/* Controls Section */}
        <div className="p-4 border-b border-slate-800 bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wider">New Transformation</h2>
          
          <div className="grid grid-cols-2 gap-3 mb-3">
             {/* Operation Type */}
             <div className="flex bg-slate-800 p-1 rounded-lg">
                <button 
                  onClick={() => setOpType('rotation')}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded ${opType === 'rotation' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <RotateCw size={14} /> Rotation
                </button>
                <button 
                  onClick={() => setOpType('translation')}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded ${opType === 'translation' ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  <ArrowRightLeft size={14} /> Translation
                </button>
             </div>

             {/* Frame Type */}
             <div className="flex bg-slate-800 p-1 rounded-lg">
                <button 
                  onClick={() => setFrame('fixed')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded ${frame === 'fixed' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Fixed (XYZ)
                </button>
                <button 
                  onClick={() => setFrame('mobile')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded ${frame === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Mobile (x'y'z')
                </button>
             </div>
          </div>

          <div className="grid grid-cols-12 gap-3 items-end">
             {/* Axis Selection */}
             <div className="col-span-4">
               <label className="block text-xs text-slate-500 mb-1">Axis</label>
               <div className="flex gap-1">
                 {(['x', 'y', 'z'] as Axis[]).map((a) => (
                   <button
                    key={a}
                    onClick={() => setAxis(a)}
                    className={`flex-1 h-9 rounded font-bold uppercase text-sm border-b-2 transition-all
                      ${axis === a && a === 'x' ? 'bg-red-500/20 text-red-400 border-red-500' : ''}
                      ${axis === a && a === 'y' ? 'bg-green-500/20 text-green-400 border-green-500' : ''}
                      ${axis === a && a === 'z' ? 'bg-blue-500/20 text-blue-400 border-blue-500' : ''}
                      ${axis !== a ? 'bg-slate-800 border-transparent text-slate-500 hover:bg-slate-700' : ''}
                    `}
                   >
                     {a}
                   </button>
                 ))}
               </div>
             </div>

             {/* Value Input */}
             <div className="col-span-4">
                <label className="block text-xs text-slate-500 mb-1">
                  {opType === 'rotation' ? 'Angle (deg)' : 'Distance'}
                </label>
                <div className="flex">
                   <button 
                    onClick={toggleSign}
                    className="h-9 px-2 bg-slate-700 border border-slate-600 border-r-0 rounded-l text-white hover:bg-slate-600 font-mono text-sm"
                    title="Toggle +/-"
                   >
                     ±
                   </button>
                   <input 
                    type="number" 
                    value={value}
                    onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
                    className="w-full h-9 bg-slate-800 border border-slate-700 rounded-r px-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
             </div>

             {/* Action Button */}
             <div className="col-span-4">
               <button 
                onClick={handleAddStep}
                className="w-full h-9 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
               >
                 <Plus size={16} /> Apply
               </button>
             </div>
          </div>
        </div>

        {/* History List */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          <div className="flex justify-between items-center mb-2">
             <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Transformation History</h2>
             {steps.length > 0 && (
                <button onClick={handleUndo} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
                  <Undo2 size={12} /> Undo Last
                </button>
             )}
          </div>

          {steps.length === 0 ? (
             <div className="text-center py-10 text-slate-600 italic text-sm">
               No transformations applied yet.<br/>The system is at Identity.
             </div>
          ) : (
            steps.map((step, index) => (
              <div key={step.id} className="relative group">
                 {/* Connection Line */}
                 {index < steps.length - 1 && (
                   <div className="absolute left-4 top-10 bottom-[-16px] w-0.5 bg-slate-800"></div>
                 )}
                 
                 <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:border-slate-600 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-3">
                          <div className={`
                             w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                             ${step.type === 'rotation' ? 'bg-blue-900/50 text-blue-300' : 'bg-green-900/50 text-green-300'}
                          `}>
                            {index + 1}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-200">
                               {step.type === 'rotation' ? 'Rot' : 'Trans'}({step.axis.toUpperCase()}, {step.value}{step.type === 'rotation' ? '°' : ''})
                            </div>
                            <div className="text-xs text-slate-500">
                               in {step.frame === 'fixed' ? 'Fixed (XYZ)' : "Mobile (x'y'z')"} frame
                            </div>
                          </div>
                       </div>
                    </div>
                    {/* Matrix for this step */}
                    <MatrixDisplay matrix={step.stepMatrix} title="Step Matrix" className="bg-slate-900/80" />
                 </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 grid grid-cols-2 gap-3">
           <button 
             disabled={steps.length === 0}
             onClick={() => setShowResult('final')}
             className="flex items-center justify-center gap-2 py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
           >
             <Info size={14} /> Total Matrix (T)
           </button>
           <button 
             disabled={steps.length === 0}
             onClick={() => setShowResult('inverse')}
             className="flex items-center justify-center gap-2 py-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
           >
             <Calculator size={14} /> Inverse Matrix (T⁻¹)
           </button>
        </div>
      </div>

      {/* Result Modal */}
      {showResult !== 'none' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 className="text-lg font-bold text-white">
                  {showResult === 'final' ? 'Total Transformation Matrix' : 'Inverse Transformation Matrix'}
                </h3>
                <button onClick={() => setShowResult('none')} className="text-slate-400 hover:text-white">✕</button>
              </div>
              
              <div className="p-6">
                <p className="text-sm text-slate-400 mb-4">
                  {showResult === 'final' 
                    ? 'This matrix represents the final pose with respect to the initial (0,0,0) coordinate system.' 
                    : 'This matrix allows you to calculate the Initial pose with respect to the Final frame (reverses the transformation).'}
                </p>
                <MatrixDisplay 
                  matrix={showResult === 'final' ? currentMatrix : getInverseMatrix()} 
                  highlight 
                  className="bg-slate-800"
                />
              </div>

              <div className="p-4 bg-slate-950 border-t border-slate-800 text-right">
                <button 
                  onClick={() => setShowResult('none')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};

export default App;