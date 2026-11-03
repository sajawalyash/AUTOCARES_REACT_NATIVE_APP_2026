const {
  withProjectBuildGradle,
  createRunOncePlugin,
} = require('@expo/config-plugins');

const withSubprojectsBuildConfig = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const block = `
subprojects {
    plugins.withId("com.android.library") {
        android {
            buildFeatures {
                buildConfig = true
            }
        }
    }
    plugins.withId("com.android.application") {
        android {
            buildFeatures {
                buildConfig = true
            }
        }
    }
}
`;
      if (!config.modResults.contents.includes('plugins.withId("com.android.library")')) {
        config.modResults.contents += block;
      }
    }
    return config;
  });
};

const withBuildConfig = (config) => {
  return withSubprojectsBuildConfig(config);
};

module.exports = createRunOncePlugin(withBuildConfig, 'withBuildConfig', '1.0.0');
