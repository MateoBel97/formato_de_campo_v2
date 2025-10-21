#!/usr/bin/env bash

# This script runs after dependencies are installed and prebuild has completed
set -e

echo "🔧 Running post-install hook to fix Kotlin compatibility..."

# Define Kotlin version
KOTLIN_VERSION="1.9.25"

# Create patch file for build.gradle
cat > /tmp/build.gradle.patch << 'PATCH_EOF'
// Top-level build file where you can add configuration options common to all sub-projects/modules.

buildscript {
  ext {
    kotlinVersion = '1.9.25'
  }
  repositories {
    google()
    mavenCentral()
  }
  dependencies {
    classpath('com.android.tools.build:gradle')
    classpath('com.facebook.react:react-native-gradle-plugin')
    classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")
  }
}

allprojects {
  repositories {
    google()
    mavenCentral()
    maven { url 'https://www.jitpack.io' }
  }

  configurations.all {
    resolutionStrategy {
      force "org.jetbrains.kotlin:kotlin-stdlib:$kotlinVersion"
      force "org.jetbrains.kotlin:kotlin-stdlib-jdk7:$kotlinVersion"
      force "org.jetbrains.kotlin:kotlin-stdlib-jdk8:$kotlinVersion"
    }
  }
}

apply plugin: "expo-root-project"
apply plugin: "com.facebook.react.rootproject"
PATCH_EOF

# Apply patch if android/build.gradle exists
if [ -f "android/build.gradle" ]; then
  echo "📝 Patching android/build.gradle with Kotlin $KOTLIN_VERSION..."
  cp /tmp/build.gradle.patch android/build.gradle
  echo "✅ Updated android/build.gradle"
else
  echo "⚠️  android/build.gradle not found - skipping"
fi

# Update gradle.properties
if [ -f "android/gradle.properties" ]; then
  # Check if kotlinVersion already exists
  if ! grep -q "kotlinVersion=" android/gradle.properties; then
    echo "📝 Adding Kotlin version to android/gradle.properties..."
    echo "" >> android/gradle.properties
    echo "# Kotlin version to fix compatibility issues" >> android/gradle.properties
    echo "kotlinVersion=$KOTLIN_VERSION" >> android/gradle.properties
    echo "✅ Updated android/gradle.properties"
  else
    echo "ℹ️  kotlinVersion already set in android/gradle.properties"
  fi
else
  echo "⚠️  android/gradle.properties not found - skipping"
fi

echo "✅ Post-install hook completed successfully!"
