import type { FlattenedWidgetProps } from "WidgetProvider/constants";
import { updateAndSaveLayout } from "actions/pageActions";
import {
  ReduxActionErrorTypes,
  type ReduxAction,
} from "@appsmith/constants/ReduxActionConstants";
import { MAIN_CONTAINER_WIDGET_ID } from "constants/WidgetConstants";
import { updateAnvilParentPostWidgetDeletion } from "layoutSystems/anvil/utils/layouts/update/deletionUtils";
import type { CanvasWidgetsReduxState } from "reducers/entityReducers/canvasWidgetsReducer";
import { put, select, takeLatest } from "redux-saga/effects";
import { SectionWidget } from "widgets/anvil/SectionWidget";
import { AnvilReduxActionTypes } from "../actions/actionTypes";
import { all } from "axios";
import { LayoutSystemTypes } from "layoutSystems/types";
import { getLayoutSystemType } from "selectors/layoutSystemSelectors";

function* updateAndSaveAnvilLayoutSaga(
  action: ReduxAction<{
    isRetry?: boolean;
    widgets: CanvasWidgetsReduxState;
    shouldReplay?: boolean;
    updatedWidgetIds?: string[];
  }>,
) {
  try {
    const { widgets } = action.payload;
    const layoutSystemType: LayoutSystemTypes =
      yield select(getLayoutSystemType);
    if (layoutSystemType !== LayoutSystemTypes.ANVIL || !widgets) {
      yield put(updateAndSaveLayout(widgets));
    }

    let updatedWidgets: CanvasWidgetsReduxState = { ...widgets };

    /**
     * Extract all section widgets
     */
    const sections: FlattenedWidgetProps[] = Object.values(widgets).filter(
      (each: FlattenedWidgetProps) => each.type === SectionWidget.type,
    );

    for (const each of sections) {
      const children: string[] | undefined = each.children;
      /**
       * If a section doesn't have any children,
       * => delete it.
       */
      if (!children || !children?.length) {
        let parent: FlattenedWidgetProps =
          updatedWidgets[each.parentId || MAIN_CONTAINER_WIDGET_ID];
        if (parent) {
          parent = {
            ...parent,
            children: parent.children?.filter(
              (id: string) => id !== each.widgetId,
            ),
          };
          delete updatedWidgets[each.widgetId];
          updatedWidgets = updateAnvilParentPostWidgetDeletion(
            { ...updatedWidgets, [parent.widgetId]: parent },
            parent.widgetId,
            each.widgetId,
            each.type,
          );
        }
      } else if (each.zoneCount !== each.children?.length) {
        /**
         * If section's zone count doesn't match it's child count,
         * => update the zone count.
         */
        updatedWidgets = {
          ...updatedWidgets,
          [each.widgetId]: {
            ...each,
            zoneCount: each.children?.length,
          },
        };
      }
    }
    yield put(updateAndSaveLayout(updatedWidgets));
  } catch (error) {
    yield put({
      type: ReduxActionErrorTypes.WIDGET_OPERATION_ERROR,
      payload: {
        action: AnvilReduxActionTypes.SAVE_ANVIL_LAYOUT,
        error,
      },
    });
  }
}

export default function* anvilUpdateLayoutSagas() {
  yield all([
    takeLatest(
      AnvilReduxActionTypes.SAVE_ANVIL_LAYOUT,
      updateAndSaveAnvilLayoutSaga,
    ),
  ]);
}
