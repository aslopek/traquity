export type PositionPieChartGeometry = {
  pieStartAngleDegrees: number
  doughnutInnerRadius: number
  doughnutOuterRadius: number
  hairlineRadius: number
  hairlineStrokeWidth: number
  labelLineLength: number
  labelRadius: number
  labelRadiusFlipped: number
  labelFontSize: number
  labelLetterSpacing: number
  arcGapDegrees: number
  averageGlyphWidthFactor: number
  hoverBandInnerPadding: number
  hoverBandOuterPadding: number
};

export const positionPieChartGeometry: PositionPieChartGeometry = {
  pieStartAngleDegrees: 0,
  doughnutInnerRadius: 30,
  doughnutOuterRadius: 40,
  hairlineRadius: 42.5,
  hairlineStrokeWidth: 0.31,
  // pixels, not viewBox units: echarts measures a leader line in device pixels. A label keeps its place on the ray
  // of its own slice and is truncated to whatever room is left between there and the canvas edge, so every pixel
  // spent here is a pixel the label text no longer has - short both sits the labels near the donut and feeds them.
  labelLineLength: 30,
  labelRadius: 44.5,
  labelRadiusFlipped: 46.5,
  labelFontSize: 1.9,
  labelLetterSpacing: 0.06,
  arcGapDegrees: 0.9,
  averageGlyphWidthFactor: 0.6,
  // how far inward of the hairline radius, and outward of the label radius, the invisible hover band reaches -
  // the outer padding covers the label glyphs' ascenders/descenders so the tooltip area includes the label even
  // when it's too small to render its own text
  hoverBandInnerPadding: 1.25,
  hoverBandOuterPadding: 1.5
} as const;
