import { Matrix4 } from 'three';

export type Axis = 'x' | 'y' | 'z';
export type FrameType = 'fixed' | 'mobile';
export type OperationType = 'rotation' | 'translation';

export interface TransformationStep {
  id: string;
  type: OperationType;
  axis: Axis;
  value: number; // Degrees for rotation, Units for translation
  frame: FrameType;
  stepMatrix: Matrix4; // The matrix representing ONLY this change
  cumulativeMatrix: Matrix4; // The matrix representing Initial -> After this step
}
