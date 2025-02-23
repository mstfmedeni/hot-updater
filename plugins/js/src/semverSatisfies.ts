import semver from "semver";

export const semverSatisfies = (
  targetAppVersion: string,
  currentVersion: string,
) => {
  const [targetBase, targetBuild] = targetAppVersion.split('+');
  const [currentBase, currentBuild] = currentVersion.split('+');
  
  const currentCoerce = semver.coerce(currentBase);
  const targetCoerce = semver.coerce(targetBase);
  
  if (!currentCoerce || !targetCoerce) {
    return false;
  }

  const isExactVersion = currentCoerce.version === targetCoerce.version;

  if (isExactVersion) {
    const targetBuildStr = targetBuild || '0';
    const currentBuildStr = currentBuild || '0';

    if (targetBuildStr.includes('x')) {
      const pattern = targetBuildStr
        .replace(/x/gi, '\\d') 
        .replace(/\d/g, match => match); 
      
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(currentBuildStr);
    }

    const targetBuildNum = parseInt(targetBuildStr, 10);
    const currentBuildNum = parseInt(currentBuildStr, 10);
    
    if (isNaN(targetBuildNum) || isNaN(currentBuildNum)) {
      return false;
    }

    return currentBuildNum >= targetBuildNum;
  }

  return semver.satisfies(currentCoerce.version, targetBase);
};
