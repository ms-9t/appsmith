import { GridDefaults } from "constants/WidgetConstants";

// Here the data structure is the `widgetsToUpdate` data structure. If possible, we should create the `updates`
// we use in the function directly in the `widgets.ts` (auto height saga)
// This way, we can avoid looping again in this place.
export function directlyMutateDOMNodes(
  widgetsToUpdate: Record<
    string,
    Array<{ propertyPath: string; propertyValue: unknown }>
  >,
): void {
  const updates: Record<
    string,
    Record<string, number>
  > = getNodesAndStylesToUpdate(widgetsToUpdate);
  for (const widgetId in updates) {
    const widgetNode = document.getElementById(widgetId);
    const dropTarget = widgetNode?.querySelector(`.drop-target-${widgetId}`);

    if (widgetNode) {
      widgetNode.style.height = `${updates[widgetId].height}px`;
      widgetNode.style.transform = `translate3d(${widgetNode.style.left},${updates[widgetId].y}px)`;
      widgetNode.style.top = `${updates[widgetId].y}px`;
      if (dropTarget) {
        (dropTarget as HTMLElement).style.height = `${updates[widgetId].height}px`;
      }
    }
  }
}

function getNodesAndStylesToUpdate(
  widgetsToUpdate: Record<
    string,
    Array<{ propertyPath: string; propertyValue: unknown }>
  >,
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};
  for (const widgetId in widgetsToUpdate) {
    const propertiesToUpdate: Record<string, unknown> = {};
    for (const propertyUpdate of widgetsToUpdate[widgetId]) {
      propertiesToUpdate[propertyUpdate.propertyPath] =
        propertyUpdate.propertyValue;
    }
    let height = 0;
    let y = 0;
    if (propertiesToUpdate.topRow !== undefined) {
      height =
        ((propertiesToUpdate.bottomRow as number) -
          (propertiesToUpdate.topRow as number)) *
        GridDefaults.DEFAULT_GRID_ROW_HEIGHT;
      y =
        (propertiesToUpdate.topRow as number) *
        GridDefaults.DEFAULT_GRID_ROW_HEIGHT;
    } else {
      height = propertiesToUpdate.bottomRow as number;
    }
    result[widgetId] = { y, height };
  }
  return result;
}
