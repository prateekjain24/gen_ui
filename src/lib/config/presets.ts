export type CanvasPreset = 'canvas_mvp' | 'property_guru';

const normalizePreset = (value?: string | null): CanvasPreset => {
  if (!value) {
    return 'canvas_mvp';
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'property_guru' ? 'property_guru' : 'canvas_mvp';
};

export const getCanvasPreset = (): CanvasPreset => {
  const rawPreset =
    process.env.CANVAS_PRESET ?? process.env.NEXT_PUBLIC_CANVAS_PRESET ?? 'canvas_mvp';
  return normalizePreset(rawPreset);
};

export const isPropertyGuruPreset = (): boolean => getCanvasPreset() === 'property_guru';
