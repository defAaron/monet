export {
  bboxFromPoints,
  bboxFromPath,
  bboxArea,
  isEmptyBBox,
} from "./bbox";
export { simplifyRdp, closePath } from "./simplify";
export { clientToPreviewPoint, clampPointToSize } from "./coords";
export {
  sampleRegionFacts,
  buildSampleGrid,
  pointInPolygon,
  bboxOverlapArea,
  rankElementsByOverlap,
  previewToClientPoint,
  elementPreviewBBox,
  contrastRatio,
  parseCssColor,
  passesWcagAA,
  relativeLuminance,
  rgbToHex,
  type ScoutOptions,
  type RankedElement,
  type Rgb,
} from "./scout";
