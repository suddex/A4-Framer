
export enum FontOption {
  SERIF = 'Playfair Display, serif',
  SANS_SERIF = 'Inter, sans-serif',
  MONO = 'Roboto Mono, monospace',
  GARAMOND = 'EB Garamond, serif',
  MONTSERRAT = 'Montserrat, sans-serif',
  LATO = 'Lato, sans-serif'
}

export interface FrameSettings {
  lineThickness: number; // in pixels (for the canvas)
  marginMm: number;      // in millimeters
  text: string;
  fontFamily: string;
  fontSize: number;      // in pt
  textColor: string;
  lineColor: string;
  isBold: boolean;
  isRounded: boolean;
  cornerRadiusMm: number;
}

export const A4_RATIO = 297 / 210; // Height / Width
export const MM_TO_PX = 3.7795275591; // Approx conversion for 96 DPI
// For high quality export, we might use a higher multiplier.
