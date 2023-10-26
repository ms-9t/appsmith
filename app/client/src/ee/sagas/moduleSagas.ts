import { takeLatest, all, call, put, select } from "redux-saga/effects";

import ModuleApi from "@appsmith/api/ModuleApi";
import {
  ReduxActionTypes,
  ReduxActionErrorTypes,
} from "@appsmith/constants/ReduxActionConstants";
import { validateResponse } from "sagas/ErrorSagas";
import { getModuleById } from "@appsmith/selectors/modulesSelector";
import type { ApiResponse } from "api/ApiResponses";
import type {
  DeleteModulePayload,
  FetchModuleActionsPayload,
  SaveModuleNamePayload,
} from "@appsmith/actions/moduleActions";
import type { ReduxAction } from "@appsmith/constants/ReduxActionConstants";
import type { FetchModuleActionsResponse } from "@appsmith/api/ModuleApi";

export function* deleteModuleSaga(action: ReduxAction<DeleteModulePayload>) {
  try {
    const response: ApiResponse = yield call(
      ModuleApi.deleteModule,
      action.payload,
    );
    const isValidResponse: boolean = yield validateResponse(response);

    if (isValidResponse) {
      yield put({
        type: ReduxActionTypes.DELETE_QUERY_MODULE_SUCCESS,
        payload: action.payload,
      });
    }
  } catch (error) {
    yield put({
      type: ReduxActionErrorTypes.DELETE_QUERY_MODULE_ERROR,
      payload: { error },
    });
  }
}

export function* saveModuleNameSaga(
  action: ReduxAction<SaveModuleNamePayload>,
) {
  try {
    const { id, name } = action.payload;
    const module: ReturnType<typeof getModuleById> = yield select(
      getModuleById,
      id,
    );

    if (!module) {
      throw Error("Saving module name failed. Module not found.");
    }

    const updatedModule = {
      ...module,
      name,
    };

    const response: ApiResponse = yield call(
      ModuleApi.updateModule,
      updatedModule,
    );
    const isValidResponse: boolean = yield validateResponse(response);

    if (isValidResponse) {
      yield put({
        type: ReduxActionTypes.SAVE_MODULE_NAME_SUCCESS,
        payload: response.data,
      });
    }
  } catch (error) {
    yield put({
      type: ReduxActionErrorTypes.SAVE_MODULE_NAME_ERROR,
      payload: { error },
    });
  }
}

export function* fetchModuleActionsSagas(
  action: ReduxAction<FetchModuleActionsPayload>,
) {
  try {
    const response: ApiResponse<FetchModuleActionsResponse> = yield call(
      ModuleApi.fetchActions,
      action.payload,
    );
    const isValidResponse: boolean = yield validateResponse(response);

    if (isValidResponse) {
      yield put({
        type: ReduxActionTypes.FETCH_MODULE_ACTIONS_SUCCESS,
        payload: response.data,
      });
    }
  } catch (error) {
    yield put({
      type: ReduxActionErrorTypes.FETCH_MODULE_ACTIONS_ERROR,
      payload: { error },
    });
  }
}

export default function* modulesSaga() {
  yield all([
    takeLatest(ReduxActionTypes.DELETE_QUERY_MODULE_INIT, deleteModuleSaga),
    takeLatest(ReduxActionTypes.SAVE_MODULE_NAME_INIT, saveModuleNameSaga),
    takeLatest(
      ReduxActionTypes.FETCH_MODULE_ACTIONS_INIT,
      fetchModuleActionsSagas,
    ),
  ]);
}
