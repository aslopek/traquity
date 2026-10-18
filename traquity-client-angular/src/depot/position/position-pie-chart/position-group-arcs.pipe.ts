import {Pipe, PipeTransform} from '@angular/core';
import {PositionGroup} from '../../../store/depot/position-grouping/position-group.type';
import {PositionGroupTextPipe} from '../position-group-text.pipe';
import {positionPieChartGeometry} from './position-pie-chart-geometry';

export type PositionGroupArc = {
  id: string
  hairlinePath: string
  labelPath: string
  hoverPath: string
  hoverStrokeWidth: number
  label: string
  tooltip: string
};

@Pipe({
  name: 'positionGroupArcs',
  pure: true
})
export class PositionGroupArcsPipe implements PipeTransform {

  constructor(private readonly positionGroupTextPipe: PositionGroupTextPipe) {
  }

  transform(groups: PositionGroup[], useBuyIn: boolean, hideAbsoluteValues: boolean, currency: string): PositionGroupArc[] {
    const total: number = groups.reduce(
      (sum: number, group: PositionGroup): number => sum + (useBuyIn ? group.buyInAbsolute : group.currentSizeAbsolute), 0
    );
    if (total === 0) {
      return [];
    }

    const arcs: PositionGroupArc[] = [];
    let cumulative: number = 0;

    groups.forEach((group: PositionGroup, index: number): void => {
      const share: number = (useBuyIn ? group.buyInAbsolute : group.currentSizeAbsolute) / total;
      const thetaStart: number = screenAngle(cumulative);
      cumulative += share;
      const thetaEnd: number = screenAngle(cumulative);
      const span: number = thetaEnd - thetaStart;
      const largeArc: 0 | 1 = span > 180 ? 1 : 0;

      const inset: number = Math.min(positionPieChartGeometry.arcGapDegrees, span * 0.25);
      const insetStart: number = thetaStart + inset;
      const insetEnd: number = thetaEnd - inset;

      const hairlinePath: string = describeArc(insetStart, insetEnd, positionPieChartGeometry.hairlineRadius, largeArc, 1);

      const mid: number = normalizeAngle((insetStart + insetEnd) / 2);
      const flipped: boolean = mid > 90 && mid < 270;
      const labelRadiusUsed: number = flipped ? positionPieChartGeometry.labelRadiusFlipped : positionPieChartGeometry.labelRadius;
      const labelPath: string = flipped
        ? describeArc(insetEnd, insetStart, labelRadiusUsed, largeArc, 0)
        : describeArc(insetStart, insetEnd, labelRadiusUsed, largeArc, 1);

      // a single wide hover band spanning from just inside the hairline to just beyond the label radius, so the
      // tooltip area covers the label's position even when the arc is too narrow to render its own label text
      const hoverInnerRadius: number = positionPieChartGeometry.hairlineRadius - positionPieChartGeometry.hoverBandInnerPadding;
      const hoverOuterRadius: number = labelRadiusUsed + positionPieChartGeometry.hoverBandOuterPadding;
      const hoverRadius: number = (hoverInnerRadius + hoverOuterRadius) / 2;
      const hoverStrokeWidth: number = hoverOuterRadius - hoverInnerRadius;
      const hoverPath: string = describeArc(insetStart, insetEnd, hoverRadius, largeArc, 1);

      // the band label truncates, the tooltip is the same text untruncated - so hovering always recovers what the
      // arc was too short to show
      const full: string = this.positionGroupTextPipe.transform(group, useBuyIn, hideAbsoluteValues, true, currency);

      const spanRad: number = (insetEnd - insetStart) * Math.PI / 180;
      const arcLength: number = spanRad * labelRadiusUsed;
      const perChar: number = positionPieChartGeometry.labelFontSize * positionPieChartGeometry.averageGlyphWidthFactor
        + positionPieChartGeometry.labelLetterSpacing;
      const maxChars: number = Math.floor(arcLength / perChar);

      let label: string;
      if (full.length <= maxChars) {
        label = full;
      } else {
        label = `${full.slice(0, maxChars - 1).trimEnd()}…`;
      }
      if (maxChars < 4) {
        label = '';
      }

      arcs.push({
        id: `position-group-arc-${index}`,
        hairlinePath,
        labelPath,
        hoverPath,
        hoverStrokeWidth,
        label,
        tooltip: full
      });
    });

    return arcs;
  }
}

function screenAngle(cumulativeShare: number): number {
  return 90 - positionPieChartGeometry.pieStartAngleDegrees + 360 * cumulativeShare;
}

function point(thetaDegrees: number, radius: number): [number, number] {
  const thetaRad: number = thetaDegrees * Math.PI / 180;
  return [round(50 + radius * Math.sin(thetaRad)), round(50 - radius * Math.cos(thetaRad))];
}

function describeArc(thetaFrom: number, thetaTo: number, radius: number, largeArc: 0 | 1, sweep: 0 | 1): string {
  const [x0, y0]: [number, number] = point(thetaFrom, radius);
  const [x1, y1]: [number, number] = point(thetaTo, radius);
  return `M ${x0} ${y0} A ${radius} ${radius} 0 ${largeArc} ${sweep} ${x1} ${y1}`;
}

function normalizeAngle(theta: number): number {
  return ((theta % 360) + 360) % 360;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
