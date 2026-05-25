const DEFAULT_WIDTH = 340;
const DEFAULT_HEIGHT = 430;
const DEFAULT_MARGIN = 16;
const ANCHOR_GAP = 12;

export function computeUiNotePopoverPosition({
  clientX = 0,
  clientY = 0,
  viewportWidth = 0,
  viewportHeight = 0,
  popoverWidth = DEFAULT_WIDTH,
  popoverHeight = DEFAULT_HEIGHT,
  margin = DEFAULT_MARGIN
} = {}) {
  const safeViewportWidth = Math.max(1, Number(viewportWidth) || 1);
  const safeViewportHeight = Math.max(1, Number(viewportHeight) || 1);
  const safeMargin = Math.max(0, Number(margin) || 0);
  const usableWidth = Math.max(1, safeViewportWidth - safeMargin * 2);
  const usableHeight = Math.max(1, safeViewportHeight - safeMargin * 2);
  const width = Math.min(Math.max(1, Number(popoverWidth) || DEFAULT_WIDTH), usableWidth);
  const maxHeight = Math.min(Math.max(1, Number(popoverHeight) || DEFAULT_HEIGHT), usableHeight);
  const x = computeHorizontalPosition({ clientX, width, viewportWidth: safeViewportWidth, margin: safeMargin });
  const vertical = computeVerticalPosition({ clientY, maxHeight, viewportHeight: safeViewportHeight, margin: safeMargin });

  return {
    x,
    y: vertical.y,
    width,
    maxHeight,
    verticalPlacement: vertical.placement,
    horizontalPlacement: x + width <= Number(clientX) ? 'left' : Number(clientX) <= x ? 'right' : 'center'
  };
}

export function computeUiNoteFocusScrollDelta({
  popoverTop = 0,
  popoverBottom = 0,
  fieldTop = 0,
  fieldBottom = 0,
  padding = 12
} = {}) {
  const safePadding = Math.max(0, Number(padding) || 0);
  const bottomOverflow = Number(fieldBottom) - Number(popoverBottom) + safePadding;
  if (bottomOverflow > 0) return bottomOverflow;

  const topOverflow = Number(popoverTop) - Number(fieldTop) + safePadding;
  if (topOverflow > 0) return -topOverflow;

  return 0;
}

function computeHorizontalPosition({ clientX, width, viewportWidth, margin }) {
  const x = Number(clientX) || 0;
  const rightX = x + ANCHOR_GAP;
  const leftX = x - width - ANCHOR_GAP;

  if (rightX + width <= viewportWidth - margin) return rightX;
  if (leftX >= margin) return leftX;
  return clamp(x - width / 2, margin, viewportWidth - width - margin);
}

function computeVerticalPosition({ clientY, maxHeight, viewportHeight, margin }) {
  const y = Number(clientY) || 0;
  const belowY = y + ANCHOR_GAP;
  const aboveY = y - maxHeight - ANCHOR_GAP;
  const belowFits = belowY + maxHeight <= viewportHeight - margin;
  const aboveFits = aboveY >= margin;
  const spaceBelow = viewportHeight - margin - belowY;
  const spaceAbove = y - margin - ANCHOR_GAP;
  const placement = belowFits ? 'below' : aboveFits || spaceAbove > spaceBelow ? 'above' : 'below';
  const preferredY = placement === 'above' ? aboveY : belowY;

  return {
    y: clamp(preferredY, margin, viewportHeight - maxHeight - margin),
    placement
  };
}

function clamp(value, min, max) {
  if (max < min) return min;
  return Math.max(min, Math.min(max, value));
}
