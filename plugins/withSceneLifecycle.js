const fs = require("fs");
const path = require("path");
const {
  IOSConfig,
  withAppDelegate,
  withInfoPlist,
  withXcodeProject,
} = require("expo/config-plugins");

const SCENE_DELEGATE_SOURCE = `internal import Expo

@objc(SceneDelegate)
class SceneDelegate: ExpoAppSceneDelegate {
  // Extension point for config plugins.
}
`;

const CLASS_DECLARATION = "class AppDelegate: ExpoAppDelegate {";
const PROVIDER_DECLARATION =
  "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {";
const WINDOW_START_BLOCK =
  /\n[ \t]*#if os\(iOS\) \|\| os\(tvOS\)\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\s*factory\.startReactNative\([^)]*\)\s*#endif[ \t]*\n/;

function adoptSceneLifecycle(contents) {
  if (contents.includes(PROVIDER_DECLARATION)) return contents;
  if (!contents.includes(CLASS_DECLARATION) || !WINDOW_START_BLOCK.test(contents)) {
    throw new Error(
      "withSceneLifecycle: AppDelegate.swift does not match the expected Expo template.",
    );
  }
  return contents
    .replace(CLASS_DECLARATION, PROVIDER_DECLARATION)
    .replace(WINDOW_START_BLOCK, "\n");
}

const withSceneLifecycle = (config) => {
  config = withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== "swift") {
      throw new Error("withSceneLifecycle: only Swift AppDelegates are supported.");
    }
    mod.modResults.contents = adoptSceneLifecycle(mod.modResults.contents);
    return mod;
  });

  config = withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    };
    return mod;
  });

  config = withXcodeProject(config, (mod) => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(
      mod.modRequest.projectRoot,
    );
    const filepath = path.join(projectName, "SceneDelegate.swift");
    fs.writeFileSync(
      path.join(mod.modRequest.platformProjectRoot, filepath),
      SCENE_DELEGATE_SOURCE,
    );
    if (!mod.modResults.hasFile(filepath)) {
      mod.modResults = IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath,
        groupName: projectName,
        project: mod.modResults,
      });
    }
    return mod;
  });

  return config;
};

module.exports = withSceneLifecycle;
