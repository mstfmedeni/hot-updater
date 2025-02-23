import { exec } from "child_process";
import path from "path";
import util from "util";
import type { Platform } from "@hot-updater/plugin-core";
import fs from "fs/promises";

const findXCodeProjectFilename = async (
  cwd: string,
): Promise<string | null> => {
  try {
    const iosDirPath = path.join(cwd, "ios");
    const dirContent = await fs.readdir(iosDirPath);
    for (const item of dirContent) {
      const itemPath = path.join(iosDirPath, item);
      const stats = await fs.stat(itemPath);
      if (stats.isDirectory()) {
        const pbxprojPath = path.join(itemPath, "project.pbxproj");
        try {
          await fs.access(pbxprojPath);
          return item;
        } catch {
          // Not the directory we are looking for
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
};
export const getIOSVersion = async (cwd: string): Promise<string | null> => {
  const filename = await findXCodeProjectFilename(cwd);
  if (!filename) return null;

  const projectPath = path.join(cwd, "ios", filename);
  try {
    const execPromise = util.promisify(exec);

    // Get MARKETING_VERSION
    const { stdout: versionStdout } = await execPromise(
      `xcodebuild -project ${projectPath} -showBuildSettings | grep MARKETING_VERSION`,
    );
    const versionMatch = versionStdout.match(/MARKETING_VERSION = ([\d.]+)/);

    // Get CURRENT_PROJECT_VERSION
    const { stdout: buildStdout } = await execPromise(
      `xcodebuild -project ${projectPath} -showBuildSettings | grep CURRENT_PROJECT_VERSION`,
    );
    const buildMatch = buildStdout.match(/CURRENT_PROJECT_VERSION = (.+)/);

    if (!versionMatch?.[1]) return null;

    return buildMatch?.[1]
      ? `${versionMatch[1]}+${buildMatch[1]}`
      : versionMatch[1];
  } catch (error) {
    return null;
  }
};

export const getAndroidVersion = async (
  cwd: string,
): Promise<string | null> => {
  const buildGradlePath = path.join(cwd, "android", "app", "build.gradle");
  const versionPropertiesPath = path.join(cwd, "android", "app", "version.properties");
  try {
    const buildGradleContent = await fs.readFile(buildGradlePath, "utf8");
    const versionNameMatch = buildGradleContent.match(
      /versionName\s+"([\d.]+)"/,
    );

    if (!versionNameMatch?.[1]) return null;
    const versionCodeMatch = buildGradleContent.match(
      /versionCode\s+([^}\n]+)/
    );
    if (versionCodeMatch?.[1] && /^\d+$/.test(versionCodeMatch[1].trim())) {
      return `${versionNameMatch[1]}+${versionCodeMatch[1].trim()}`;
    }
    try {
      const versionPropertiesContent = await fs.readFile(versionPropertiesPath, "utf8");
      const versionCodePropertiesMatch = versionPropertiesContent.match(
        /VERSION_CODE\s*=\s*(\d+)/
      );

      if (versionCodePropertiesMatch?.[1]) {
        return `${versionNameMatch[1]}+${versionCodePropertiesMatch[1]}`;
      }
    } catch (error) {
      // version.properties file not found or could not be read
    }

    return versionNameMatch[1];
  } catch (error) {
    return null;
  }
};

// Helper function to combine version and build number with + separator
export const formatVersion = (
  version: string | null,
  buildNumber: string | null,
): string | null => {
  if (!version) return null;
  return buildNumber ? `${version}+${buildNumber}` : version;
};

export const getDefaultTargetAppVersion = async (
  cwd: string,
  platform: Platform,
): Promise<string | null> => {
  let version: string | null = null;

  switch (platform) {
    case "ios":
      version = await getIOSVersion(cwd);
      break;
    case "android":
      version = await getAndroidVersion(cwd);
      break;
  }

  if (!version) return null;

  // If version only has one dot (e.g. 1.0), append .x
  const dotCount = version.split(".").length - 1;
  if (dotCount === 1) {
    version = `${version}.x`;
  }

  return version;
};
