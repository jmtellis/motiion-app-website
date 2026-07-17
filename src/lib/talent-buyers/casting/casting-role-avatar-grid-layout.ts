export type CastingRoleAvatarGridLayout = {
  avatarDiameter: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  columnCount: number;
  rowCount: number;
  positions: { x: number; y: number }[];
  fillOrder: number[];
};

export type CastingRoleAvatarGridLayoutOptions = {
  /** Bleed avatars off the left/right edges for a continuous grid feel. */
  bleed?: boolean;
};

const MIN_AVATAR_DIAMETER = 16;

function buildFillOrder(
  positions: { x: number; y: number }[],
  regionWidth: number,
  regionHeight: number,
): number[] {
  const regionCenter = { x: regionWidth / 2, y: regionHeight / 2 };

  return positions
    .map((position, index) => ({ index, position }))
    .sort((left, right) => {
      const leftDistance = Math.hypot(
        left.position.x - regionCenter.x,
        left.position.y - regionCenter.y,
      );
      const rightDistance = Math.hypot(
        right.position.x - regionCenter.x,
        right.position.y - regionCenter.y,
      );
      if (Math.abs(leftDistance - rightDistance) > 0.5) {
        return leftDistance - rightDistance;
      }
      if (left.position.y !== right.position.y) {
        return left.position.y - right.position.y;
      }
      return left.position.x - right.position.x;
    })
    .map((entry) => entry.index);
}

export function computeCastingRoleAvatarGridLayout(
  regionWidth: number,
  regionHeight: number,
  rows: number,
  minColumns: number,
  options: CastingRoleAvatarGridLayoutOptions = {},
): CastingRoleAvatarGridLayout {
  const verticalSpacing = 3;
  const horizontalSpacing = 3;
  const diameterFromHeight = Math.floor(
    (regionHeight - verticalSpacing * Math.max(rows - 1, 0)) / rows,
  );

  let diameter = Math.max(MIN_AVATAR_DIAMETER, diameterFromHeight);
  let pitchX = diameter + horizontalSpacing;
  let columns = minColumns;

  if (options.bleed) {
    columns = Math.max(
      minColumns,
      Math.ceil((regionWidth + pitchX) / pitchX),
    );

    const diameterForWidth = Math.floor(
      (regionWidth - horizontalSpacing * (columns - 1)) / columns,
    );
    diameter = Math.max(
      MIN_AVATAR_DIAMETER,
      Math.min(diameterFromHeight, diameterForWidth),
    );
    pitchX = diameter + horizontalSpacing;

    columns = Math.max(
      minColumns,
      Math.ceil((regionWidth + pitchX) / pitchX),
    );
  } else {
    const diameterFromWidth = Math.floor(
      (regionWidth - horizontalSpacing * (columns - 1)) / columns,
    );
    diameter = Math.max(
      MIN_AVATAR_DIAMETER,
      Math.min(diameterFromHeight, diameterFromWidth),
    );
    pitchX = diameter + horizontalSpacing;
  }

  const radius = diameter / 2;
  const verticalStep = rows > 1 ? (regionHeight - diameter) / (rows - 1) : 0;
  const gridWidth = columns * diameter + (columns - 1) * horizontalSpacing;
  const brickOffsetX = pitchX / 2;
  const baseOriginX = options.bleed
    ? radius - brickOffsetX
    : (regionWidth - gridWidth) / 2 + radius;

  const positions: { x: number; y: number }[] = [];

  for (let row = 0; row < rows; row += 1) {
    const isStaggeredRow = row % 2 === 1;
    const originX = baseOriginX + (isStaggeredRow ? brickOffsetX : 0);
    const centerY = radius + row * verticalStep;

    for (let col = 0; col < columns; col += 1) {
      positions.push({ x: originX + col * pitchX, y: centerY });
    }
  }

  return {
    avatarDiameter: diameter,
    horizontalSpacing,
    verticalSpacing,
    columnCount: columns,
    rowCount: rows,
    positions,
    fillOrder: buildFillOrder(positions, regionWidth, regionHeight),
  };
}

/** Fill order for slot assignment — uses proportional geometry matching the iOS brick grid. */
export function computeCastingRoleAvatarFillOrder(
  rows: number,
  minColumns: number,
  options: CastingRoleAvatarGridLayoutOptions = {},
): number[] {
  const regionWidth = 240;
  const regionHeight = 152;
  return computeCastingRoleAvatarGridLayout(
    regionWidth,
    regionHeight,
    rows,
    minColumns,
    options,
  ).fillOrder;
}
