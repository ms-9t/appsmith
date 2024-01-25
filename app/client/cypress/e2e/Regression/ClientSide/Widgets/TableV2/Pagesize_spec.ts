import * as _ from "../../../../../support/Objects/ObjectsCore";
import { getWidgetSelector } from "../../../../../locators/WidgetLocators";
import PageList from "../../../../../support/Pages/PageList";
import EditorNavigation, {
  EntityType,
} from "../../../../../support/Pages/EditorNavigation";

describe(
  "Table widget v2",
  { tags: ["@tag.Widget", "@tag.Table"] },
  function () {
    it("1. should test that pageSize is computed properly for all the row sizes", function () {
      PageList.AddNewPage();
      _.entityExplorer.DragDropWidgetNVerify(_.draggableWidgets.TEXT, 300, 100);
      EditorNavigation.SelectEntityByName("Text1", EntityType.Widget);
      _.propPane.UpdatePropertyFieldValue("Text", "{{Table1.pageSize}}");
      _.entityExplorer.DragDropWidgetNVerify(
        _.draggableWidgets.TABLE,
        500,
        300,
      );
      EditorNavigation.SelectEntityByName("Table1", EntityType.Widget);
      _.propPane.MoveToTab("Style");

      _.agHelper.GetNClick(
        ".t--property-control-defaultrowheight .ads-v2-segmented-control__segments-container:nth-child(1)",
      );

      _.agHelper
        .GetText(getWidgetSelector(_.draggableWidgets.TEXT))
        .then(($text) => {
          expect($text).to.eq("7");
        });
      _.agHelper.GetNClick(
        ".t--property-control-defaultrowheight .ads-v2-segmented-control__segments-container:nth-child(2)",
      );
      _.agHelper
        .GetText(getWidgetSelector(_.draggableWidgets.TEXT))
        .then(($text) => {
          expect($text).to.eq("5");
        });

      _.agHelper.GetNClick(
        ".t--property-control-defaultrowheight .ads-v2-segmented-control__segments-container:nth-child(3)",
      );
      _.agHelper
        .GetText(getWidgetSelector(_.draggableWidgets.TEXT))
        .then(($text) => {
          expect($text).to.eq("4");
        });
    });
  },
);
