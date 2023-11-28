import React, { type ReactNode } from "react";
import type {
  AnvilConfig,
  AutocompletionDefinitions,
  WidgetBaseConfiguration,
  WidgetDefaultProps,
} from "WidgetProvider/constants";
import type { DerivedPropertiesMap } from "WidgetProvider/factory";
import type { SetterConfig, Stylesheet } from "entities/AppTheming";
import { anvilConfig, baseConfig, defaultConfig } from "./config";
import { ValidationTypes } from "constants/WidgetValidation";
import BaseWidget, {
  type WidgetProps,
  type WidgetState,
} from "widgets/BaseWidget";
import type {
  LayoutComponentProps,
  LayoutProps,
} from "layoutSystems/anvil/utils/anvilTypes";
import { renderLayouts } from "layoutSystems/anvil/utils/layouts/renderUtils";
import { RenderModes } from "constants/WidgetConstants";
import type { ContainerWidgetProps } from "widgets/ContainerWidget/widget";

class ZoneWidget extends BaseWidget<ZoneWidgetProps, WidgetState> {
  static type = "ZONE_WIDGET";

  static getConfig(): WidgetBaseConfiguration {
    return baseConfig;
  }

  static getDefaults(): WidgetDefaultProps {
    return defaultConfig;
  }

  static getPropertyPaneConfig() {
    return [];
  }
  static getPropertyPaneContentConfig() {
    return [
      {
        sectionName: "General",
        children: [
          {
            helpText: "Controls the visibility of the widget",
            propertyName: "isVisible",
            label: "Visible",
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
            defaultValue: true,
          },
          {
            propertyName: "animateLoading",
            label: "Animate loading",
            controlType: "SWITCH",
            helpText: "Controls the loading of the widget",
            defaultValue: true,
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
        ],
      },
    ];
  }

  static getPropertyPaneStyleConfig() {
    return super.getPropertyPaneStyleConfig();
  }

  static getAutocompleteDefinitions(): AutocompletionDefinitions {
    return {};
  }

  static getSetterConfig(): SetterConfig | null {
    return null;
  }

  static getDerivedPropertiesMap(): DerivedPropertiesMap {
    return {};
  }

  static getDefaultPropertiesMap(): Record<string, string> {
    return {};
  }

  static getMetaPropertiesMap(): Record<string, any> {
    return {};
  }

  static getAnvilConfig(): AnvilConfig | null {
    return anvilConfig;
  }

  static getStylesheetConfig(): Stylesheet {
    return super.getStylesheetConfig();
  }

  getWidgetView(): ReactNode {
    const map: LayoutComponentProps["childrenMap"] = {};
    (this.props.children ?? []).forEach((child: WidgetProps) => {
      map[child.widgetId] = child;
    });
    return (
      <div className="h-full w-full">
        {renderLayouts(
          this.props.layout,
          map,
          this.props.widgetId,
          "",
          this.props.renderMode || RenderModes.CANVAS,
          [],
        )}
      </div>
    );
  }
}

export interface ZoneWidgetProps extends ContainerWidgetProps<WidgetProps> {
  layout: LayoutProps[];
}

export default ZoneWidget;
