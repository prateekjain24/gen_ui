export type CanvasPreset = 'canvas_mvp' | 'property_guru';

const RAW_PRESET =
  process.env.CANVAS_PRESET?.trim().toLowerCase() ||
  process.env.NEXT_PUBLIC_CANVAS_PRESET?.trim().toLowerCase() ||
  'canvas_mvp';

const NORMALIZED_PRESET: CanvasPreset = RAW_PRESET === 'property_guru' ? 'property_guru' : 'canvas_mvp';

export const getCanvasPreset = (): CanvasPreset => NORMALIZED_PRESET;

export const isPropertyGuruPreset = (): boolean => getCanvasPreset() === 'property_guru';
