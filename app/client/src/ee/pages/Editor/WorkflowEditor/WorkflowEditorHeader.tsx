import React, { useState } from "react";
import { ThemeProvider } from "styled-components";
import { useSelector } from "react-redux";
import { EditInteractionKind, SavingState } from "design-system-old";
import { Tooltip } from "design-system";
import { getTheme, ThemeMode } from "selectors/themeSelectors";
import { EditorSaveIndicator } from "pages/Editor/EditorSaveIndicator";
import {
  createMessage,
  RENAME_WORKFLOW_TOOLTIP,
} from "@appsmith/constants/messages";
import {
  HeaderSection,
  HeaderWrapper,
} from "pages/Editor/commons/EditorHeaderComponents";
import { LockEntityExplorer } from "pages/Editor/commons/LockEntityExplorer";
import { Omnibar } from "pages/Editor/commons/Omnibar";
import { HelperBarInHeader } from "pages/Editor/HelpBarInHeader";
import { AppsmithLink } from "pages/Editor/AppsmithLink";
import EditorName from "pages/Editor/EditorName";
import { GetNavigationMenuData } from "./WorkflowEditorName/NavigationMenuData";
import {
  getCurrentWorkflow,
  getIsSavingWorkflowName,
  getisErrorSavingWorkflowName,
} from "@appsmith/selectors/workflowSelectors";
import { updateWorkflowName } from "@appsmith/actions/workflowActions";
import type { Workflow } from "@appsmith/constants/WorkflowConstants";
import { useDispatch } from "react-redux";

const theme = getTheme(ThemeMode.LIGHT);

export function WorkflowEditorHeader() {
  const dispatch = useDispatch();
  const isSavingName = useSelector(getIsSavingWorkflowName);
  const isErroredSavingName = useSelector(getisErrorSavingWorkflowName);
  const workflowList: any = [];
  const currentWorkflow = useSelector(getCurrentWorkflow);
  const workflowId = currentWorkflow?.id;

  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(false);

  const updateWorkflow = (val: string, workflow: Workflow | null) => {
    if (val !== workflow?.name) {
      dispatch(updateWorkflowName(val, workflow?.id || ""));
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <HeaderWrapper
        className="pl-1 pr-1 overflow-hidden"
        data-testid="t--appsmith-workflow-editor-header"
      >
        <HeaderSection className="space-x-2">
          <LockEntityExplorer />

          <AppsmithLink />

          <Tooltip
            content={createMessage(RENAME_WORKFLOW_TOOLTIP)}
            isDisabled={isPopoverOpen}
            placement="bottom"
          >
            <div>
              <EditorName
                className="t--workflow-name editable-worflow-name max-w-48"
                defaultSavingState={
                  isSavingName ? SavingState.STARTED : SavingState.NOT_STARTED
                }
                defaultValue={currentWorkflow?.name || ""}
                editInteractionKind={EditInteractionKind.SINGLE}
                editorName="Workflow"
                fill
                getNavigationMenu={GetNavigationMenuData}
                isError={isErroredSavingName}
                isNewEditor={
                  workflowList.filter((el: any) => el.id === workflowId)
                    .length > 0
                }
                isPopoverOpen={isPopoverOpen}
                onBlur={(value: string) =>
                  updateWorkflow(value, currentWorkflow)
                }
                setIsPopoverOpen={setIsPopoverOpen}
              />
            </div>
          </Tooltip>

          <EditorSaveIndicator
            isSaving={isSavingName}
            saveError={isErroredSavingName}
          />
        </HeaderSection>

        <HelperBarInHeader isPreview={false} />

        <HeaderSection />

        <Omnibar />
      </HeaderWrapper>
    </ThemeProvider>
  );
}

export default WorkflowEditorHeader;