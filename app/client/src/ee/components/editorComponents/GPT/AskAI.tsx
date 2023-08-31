import React, { useCallback, useEffect, useRef, useMemo } from "react";
import { useState } from "react";
import styled from "styled-components";
import classNames from "classnames";
import type {
  TAssistantPrompt,
  TChatGPTContext,
  TChatGPTPrompt,
} from "./utils";
import { GPTTask } from "./utils";
import { useTextAutocomplete } from "./utils";
import { useGPTTask } from "./utils";
import { useGPTContextGenerator } from "./utils";
import AnalyticsUtil from "utils/AnalyticsUtil";
import { ErrorPrompt, UserPrompt } from "./GPTPrompt";
import type { CodeEditorExpected } from "components/editorComponents/CodeEditor";
import { examplePrompts } from "./GetStarted";
import BetaCard from "components/editorComponents/BetaCard";
import { Button } from "design-system";
import { usePrevious } from "@mantine/hooks";
import type { FieldEntityInformation } from "components/editorComponents/CodeEditor/EditorConfig";

const QueryForm = styled.form`
  > div {
    border-radius: var(--ads-v2-border-radius);
    border: 1px solid var(--ads-v2-color-border);
    color: var(--ads-v2-color-fg-muted);
    &:focus-within {
      border: 1px solid var(--ads-v2-color-border-emphasis-plus);
      outline: var(--ads-v2-border-width-outline) solid
        var(--ads-v2-color-outline);
      outline-offset: var(--ads-v2-offset-outline);
    }
    &.disabled {
      opacity: var(--ads-v2-opacity-disabled);
    }
  }
  textarea {
    color: var(--ads-v2-color-fg);
    background: transparent;
    z-index: 2;
    font-size: 14px;
    padding: 6px 0;
    line-height: 16px;
    padding-right: 8px;
  }
  .autocomplete-overlay {
    color: #afafaf;
    position: absolute;
    padding: 6px 0;
    font-size: 14px;
    padding-right: 8px;
    line-height: 16px;
    z-index: 1;
    top: 0;
  }
`;

const resizeTextArea = (el: React.RefObject<HTMLTextAreaElement>) => {
  if (!el.current) return;
  el.current.style.height = "";
  el.current.style.height = el.current.scrollHeight + "px";
};

const CHARACTER_LIMIT = 500;

type TAskAIProps = {
  update?: (...args: any) => void;
  close: () => void;
  triggerContext?: CodeEditorExpected;
  dataTreePath?: string;
  isOpen?: boolean;
  currentValue: string;
  entity: FieldEntityInformation;
};

export function AskAI(props: TAskAIProps) {
  const { close, currentValue, dataTreePath, triggerContext } = props;
  const ref = useRef<HTMLDivElement>(null);
  const contextGenerator = useGPTContextGenerator(
    props.dataTreePath,
    props.triggerContext,
  );
  const task = useGPTTask();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  /**
   * Store the AI response
   * `null` value represents the state when AI response is either not generated or rejected.
   */
  const [response, setResponse] = React.useState<TAssistantPrompt | null>(null);
  const [query, setQuery] = useState("");
  const queryContainerRef = useTextAutocomplete(query, setQuery);

  /**
   * Called when AI response is received
   * Stores the response and calls the update method
   * @param value
   */
  const updateResponse = (
    value: TAssistantPrompt | null,
    wrapWithBinding = true,
  ) => {
    setResponse(value);
    const responseContent =
      wrapWithBinding && task.id === GPTTask.JS_EXPRESSION
        ? `{{${value?.content}}}`
        : value?.content;
    props.update?.(responseContent || "");
  };

  const prevOpen = usePrevious(props.isOpen);

  /**
   * Holds the default value of the property
   */
  const defaultValue = React.useRef<string>(currentValue);

  useEffect(() => {
    // Popover close -> open
    if (prevOpen !== props.isOpen && props.isOpen) {
      defaultValue.current = currentValue;
      setQuery("");
      setResponse(null);
    }
  }, [props.isOpen, currentValue, prevOpen]);

  /**
   * When this is invoked the field should already be updated.
   * Logs analytics and closes the popover.
   * @param query
   * @param task
   */
  const acceptResponse = useCallback(
    (implicit = false) => {
      if (response) {
        AnalyticsUtil.logEvent("AI_RESPONSE_FEEDBACK", {
          responseId: response.messageId,
          requestedOutputType: task.id,
          liked: true,
          generatedCode: response.content,
          userQuery: query,
          implicit,
          property: props.entity.propertyPath,
          widgetName: props.entity.entityName,
          widgetType: props.entity.widgetType,
        });
      }
      defaultValue.current = currentValue;
      setResponse(null);
      close();
    },
    [currentValue, close, response, query, task, dataTreePath, setResponse],
  );

  useEffect(() => {
    acceptResponseRef.current = acceptResponse;
  }, [acceptResponse]);

  useEffect(() => {
    return () => {
      acceptResponseRef.current?.(true);
    };
  }, []);

  /** To hold the latest reference of props.acceptResponse,
   * It needs to be fired when the component unmounts */
  const acceptResponseRef = useRef(acceptResponse);

  /**
   * Sets the AI response to null and restore the property to its default value.
   * @param query
   * @param task
   */
  const rejectResponse = () => {
    // If response is empty, all changes are committed.
    if (!response) return;
    if (!query) return;
    AnalyticsUtil.logEvent("AI_RESPONSE_FEEDBACK", {
      responseId: response.messageId,
      requestedOutputType: task.id,
      liked: false,
      generatedCode: response.content,
      userQuery: query,
      property: props.entity.propertyPath,
      widgetName: props.entity.entityName,
      widgetType: props.entity.widgetType,
    });
    setResponse(null);
    props.update?.(defaultValue.current || "");
  };

  const sendQuery = useCallback(() => {
    if (isLoading) return;
    if (!query) return;
    const message: TChatGPTPrompt = {
      role: "user",
      content: query.slice(0, CHARACTER_LIMIT),
      task: task.id,
    };
    const [context, additionalQuery, wrapWithBinding] =
      contextGenerator(message);
    fireQuery(
      message.content,
      context,
      task.id,
      additionalQuery,
      wrapWithBinding,
    );
  }, [isLoading, query, contextGenerator, task]);

  useEffect(() => {
    resizeTextArea(queryContainerRef);
  }, [query]);

  useEffect(() => {
    queryContainerRef.current?.focus();
  }, [isLoading]);

  const fireQuery = async (
    query: string,
    context: TChatGPTContext,
    task: GPTTask,
    additionalQuery = "",
    wrapWithBinding = true,
  ) => {
    setError("");
    setIsLoading(true);
    const enhancedQuery = `${query}. ${additionalQuery}`;
    AnalyticsUtil.logEvent("AI_QUERY_SENT", {
      requestedOutputType: task,
      characterCount: query.length,
      userQuery: query,
      enhancedQuery,
      context,
      property: props.entity.propertyPath,
      widgetName: props.entity.entityName,
      widgetType: props.entity.widgetType,
    });
    const start = performance.now();
    try {
      const res: Response = await fetch(
        `/api/v1/chat/chat-generation?type=${task}`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_query: enhancedQuery,
            ...context,
          }),
        },
      );
      const result: { data: any; responseMeta: any } = await res.json();
      if (!res?.ok) {
        throw new Error(
          result?.responseMeta?.error?.message || "Something went wrong",
        );
      }
      const content = result.data.response || "";
      // If the response starts with Error: then we throw an error
      // This is a temp hack to get around the fact that the API doesn't return
      // a 500 when there is an error.
      if (content.startsWith("Error:")) {
        throw new Error(content);
      }
      const message: TChatGPTPrompt = {
        role: "assistant",
        content,
        messageId: result.data.messageId,
        task: task,
        query,
      };
      AnalyticsUtil.logEvent("AI_RESPONSE_GENERATED", {
        success: true,
        requestedOutputType: task,
        responseId: message.messageId,
        generatedCode: message.content,
        userQuery: query,
        context,
        timeTaken: performance.now() - start,
        property: props.entity.propertyPath,
        widgetName: props.entity.entityName,
        widgetType: props.entity.widgetType,
      });
      updateResponse(message, wrapWithBinding);
    } catch (e) {
      setError((e as any).message);
      AnalyticsUtil.logEvent("AI_RESPONSE_GENERATED", {
        success: false,
        requestedOutputType: task,
        timeTaken: performance.now() - start,
        userQuery: query,
        context,
        property: props.entity.propertyPath,
        widgetName: props.entity.entityName,
        widgetType: props.entity.widgetType,
      });
    }
    setIsLoading(false);
  };

  const handleEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) return;
    if (e.key == "Enter") {
      e.preventDefault();
      sendQuery();
    }
  };

  const placeholder = useMemo(() => {
    let customPlaceholder = "Type your query here...";
    if (task.id === GPTTask.JS_EXPRESSION) {
      if (triggerContext?.autocompleteDataType) {
        const placeholder =
          examplePrompts[task.id][triggerContext?.autocompleteDataType];
        if (placeholder) {
          customPlaceholder = `${placeholder}`;
        }
      }
    }
    return customPlaceholder;
  }, [task.id, triggerContext]);

  return (
    <div
      className="flex flex-col justify-between h-full w-full overflow-hidden"
      ref={ref}
    >
      <div
        className={classNames(
          "flex flex-col flex-shrink-0 p-4",
          !task && "hidden",
        )}
      >
        <div className="flex flex-row justify-between pb-4">
          <div className="flex items-center gap-1">
            <p className="text-sm font-medium text-[color:var(--ads-v2\-color-fg-emphasis)]">
              {task.desc}
            </p>
            <BetaCard />
          </div>
          <Button
            isIconButton
            kind="tertiary"
            onClick={close}
            size="sm"
            startIcon="close-line"
          />
        </div>
        {error && (
          <ErrorPrompt
            prompt={{ content: error, task: task.id, role: "error" }}
          />
        )}
        <QueryForm
          className={classNames(
            "flex w-full relative items-start gap-2 justify-between",
            response && "hidden",
          )}
        >
          <div
            className={classNames({
              "bg-white relative flex items-center w-full overflow-hidden":
                true,
              "py-[3px] px-2 pr-0": true,
              disabled: isLoading,
            })}
          >
            <div className="relative flex h-auto items-center w-full">
              <textarea
                className="min-h-[28px] w-full max-h-40 z-2 overflow-auto"
                disabled={isLoading}
                name="text"
                onChange={(e) => {
                  setQuery(e.target.value);
                }}
                onKeyDown={handleEnter}
                placeholder={`${placeholder}`}
                ref={queryContainerRef}
                rows={1}
                style={{ resize: "none" }}
                value={query}
              />
            </div>
          </div>
          <Button
            className="!z-2 flex-shrink-0"
            color="red"
            isIconButton
            isLoading={isLoading}
            kind="secondary"
            onClick={sendQuery}
            size="md"
            startIcon="enter-line"
          />
        </QueryForm>
        <div
          className={classNames(
            response && "hidden",
            "flex items-center justify-end text-[11px] mt-[10px]",
          )}
        >
          <span className="text-[color:var(--ads-v2\-color-fg-muted)]">
            Powered by&nbsp;
          </span>
          <a
            className="text-[color:var(--ads-v2\-color-fg-brand)]"
            href="https://appsmith.notion.site/AI-features-in-Appsmith-fd22891eb9b946e4916995cecf97a9ad"
            rel="noreferrer"
            target="_blank"
          >
            Appsmith AI
          </a>
        </div>
        <div className={classNames("flex flex-col", !response && "hidden")}>
          <UserPrompt
            prompt={{ content: query, task: task.id, role: "user" }}
          />
          <div className="flex flex-row justify-end items-center pb-1 gap-2">
            <Button
              kind="secondary"
              onClick={() => acceptResponse()}
              startIcon="check-line"
            >
              Accept
            </Button>
            <Button
              kind="secondary"
              onClick={() => rejectResponse()}
              startIcon="close"
            >
              Reject
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}