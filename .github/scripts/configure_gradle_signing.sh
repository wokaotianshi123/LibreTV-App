#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

GRADLE_FILE="src-tauri/gen/android/app/build.gradle.kts"
TEMP_GRADLE_FILE="$GRADLE_FILE.tmp"

if [ ! -f "$GRADLE_FILE" ]; then
  echo "Error: $GRADLE_FILE not found. Android init might have failed or path is incorrect."
  exit 1
fi

echo "Modifying $GRADLE_FILE for signing..."

# Ensure imports are present at the top
MISSING_IMPORTS=""
# Check and prepare missing imports in reverse order of desired appearance
if ! grep -q "import java.util.Properties" "$GRADLE_FILE"; then
  MISSING_IMPORTS="import java.util.Properties\n$MISSING_IMPORTS"
fi
if ! grep -q "import java.io.FileInputStream" "$GRADLE_FILE"; then
  MISSING_IMPORTS="import java.io.FileInputStream\n$MISSING_IMPORTS"
fi

if [ -n "$MISSING_IMPORTS" ]; then
  # Prepend all missing imports to the file content
  CURRENT_CONTENT=$(cat "$GRADLE_FILE")
  echo -e "${MISSING_IMPORTS}${CURRENT_CONTENT}" > "$TEMP_GRADLE_FILE" && mv "$TEMP_GRADLE_FILE" "$GRADLE_FILE"
  echo "Added missing imports."
else
  echo "Required imports already present."
fi

# Add signingConfigs block using awk
# This looks for 'android {', then for 'buildTypes {', and inserts the block before 'buildTypes'.
# It uses markers to ensure idempotency.
SIGNING_CONFIG_MARKER_START="// SIGNING_CONFIG_LIBRETV_START (do not modify or remove this line)"
SIGNING_CONFIG_MARKER_END="// SIGNING_CONFIG_LIBRETV_END (do not modify or remove this line)"

# Content of the signingConfigs block
# Using explicit java.util.Properties and java.io.FileInputStream for clarity.
# Path to keystore.properties is relative to the app/build.gradle.kts file.
read -r -d '' SIGNING_CONFIG_BLOCK_CONTENT << EOM
    signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("../keystore.properties")
            val keystoreProperties = java.util.Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(java.io.FileInputStream(keystorePropertiesFile))
            }

            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["password"] as String
            storeFile = file(keystoreProperties["storeFile"] as String) // Gradle's file() resolves path
            storePassword = keystoreProperties["password"] as String
        }
    }
EOM

if ! grep -Fq "$SIGNING_CONFIG_MARKER_START" "$GRADLE_FILE"; then
  awk -v marker_start="$SIGNING_CONFIG_MARKER_START" \
      -v marker_end="$SIGNING_CONFIG_MARKER_END" \
      -v block_content="$SIGNING_CONFIG_BLOCK_CONTENT" '
    BEGIN { android_block_found = 0; printed_block = 0; }
    /android *{/ { android_block_found = 1; }
    android_block_found && /buildTypes *{/ && !printed_block {
      print marker_start;
      print block_content;
      print marker_end;
      printed_block = 1; # Ensure block is printed only once
    }
    { print $0; }
  ' "$GRADLE_FILE" > "$TEMP_GRADLE_FILE" && mv "$TEMP_GRADLE_FILE" "$GRADLE_FILE"
  echo "Added signingConfigs block to $GRADLE_FILE."
else
  echo "signingConfigs block already present in $GRADLE_FILE (marker found)."
fi

# Modify buildTypes.release to use the signingConfig
# Using a marker to ensure idempotency
BUILD_TYPE_SIGNING_CONFIG_MARKER="// SIGNING_CONFIG_APPLIED_LIBRETV (do not modify or remove this line)"
SIGNING_CONFIG_LINE="            signingConfig = signingConfigs.getByName(\"release\")"

if ! grep -Fq "$BUILD_TYPE_SIGNING_CONFIG_MARKER" "$GRADLE_FILE"; then
  # This awk script finds 'getByName("release") {', then adds the signingConfig line and a marker
  # It aims to insert it cleanly within the release block.
  awk -v marker="$BUILD_TYPE_SIGNING_CONFIG_MARKER" \
      -v config_line="$SIGNING_CONFIG_LINE" '
    BEGIN { in_release_block = 0; config_added = 0; }
    /getByName\("release"\) *{/ { 
      print $0; 
      in_release_block = 1; 
      # Try to add after the opening brace if the block is not empty
      # This part is tricky if the block is one line e.g. getByName("release") { }
      # For a multi-line block, this should work.
      next; 
    }
    in_release_block && /{/ && !config_added { # Just after the opening brace of the release block
        print $0 # print the line with {
        print config_line;
        print "            " marker; # Indent marker like config_line
        config_added = 1;
        next
    }
    in_release_block && /}/ { # Closing brace of release block
      if (!config_added) { # If block was empty or one-liner, config_line might not have been added
        # Insert before this closing brace
        print config_line;
        print "            " marker;
        config_added = 1; 
      }
      print $0;
      in_release_block = 0; # Exit release block
      next;
    }
    { print $0; }
  ' "$GRADLE_FILE" > "$TEMP_GRADLE_FILE" && mv "$TEMP_GRADLE_FILE" "$GRADLE_FILE"
  echo "Configured release build type to use signingConfig in $GRADLE_FILE."
else
  echo "Release build type signingConfig already present in $GRADLE_FILE (marker found)."
fi

echo "Finished modifying $GRADLE_FILE."
echo "--- Content of $GRADLE_FILE after modification: ---"
cat "$GRADLE_FILE"
echo "--- End of $GRADLE_FILE content ---"
