import { generatePath } from "react-router";
import { moduleEditorURL } from "./RouteBuilder";
import { MODULE_EDITOR_PATH } from "@appsmith/constants/routes/packageRoutes";

function mockPathname(pathname: string) {
  Object.defineProperty(window, "location", {
    value: {
      pathname,
      search: "",
    },
    writable: true,
  });
}

describe("moduleEditorURL", () => {
  let originalLocation: typeof window.location;

  beforeEach(() => {
    // Store the original location object
    originalLocation = window.location;
  });

  afterEach(() => {
    // Restore the original location object after the test
    window.location = originalLocation;
  });

  it("should generate the new module URL with a moduleId", () => {
    const packageId = "test-package-id";
    const currentModuleId = "current-module-id";
    const testModuleId = "testModuleId";
    const currentUrl = generatePath(MODULE_EDITOR_PATH, {
      packageId,
      moduleId: currentModuleId,
    });
    const expectedUrl = generatePath(MODULE_EDITOR_PATH, {
      packageId,
      moduleId: testModuleId,
    });

    mockPathname(currentUrl);

    const url = moduleEditorURL({ moduleId: testModuleId });

    expect(url).toBe(expectedUrl);
  });

  it("should generate the current module URL without a moduleId", () => {
    const packageId = "test-package-id";
    const currentModuleId = "current-module-id";

    const currentUrl = generatePath(MODULE_EDITOR_PATH, {
      packageId,
      moduleId: currentModuleId,
    });

    mockPathname(currentUrl);

    const url = moduleEditorURL({});

    // Assert
    expect(url).toBe(currentUrl);
  });
});