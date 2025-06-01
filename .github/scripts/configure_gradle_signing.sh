#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

GRADLE_FILE="src-tauri/gen/android/app/build.gradle.kts"
TEMP_GRADLE_FILE="$GRADLE_FILE.tmp" # Still used by awk later

if [ ! -f "$GRADLE_FILE" ]; then
  echo "Error: $GRADLE_FILE not found. Android init might have failed or path is incorrect."
  exit 1
fi

echo "Modifying $GRADLE_FILE for signing..."

# Ensure imports are present at the top using sed -i '1i TEXT'
echo "Checking and adding missing imports..."
if ! grep -q "import java.util.Properties;" "$GRADLE_FILE" && ! grep -q "import java.util.Properties" "$GRADLE_FILE"; then
  echo "Adding import java.util.Properties..."
  sed -i '1iimport java.util.Properties' "$GRADLE_FILE"
fi
if ! grep -q "import java.io.FileInputStream;" "$GRADLE_FILE" && ! grep -q "import java.io.FileInputStream" "$GRADLE_FILE"; then
  echo "Adding import java.io.FileInputStream..."
  sed -i '1iimport java.io.FileInputStream' "$GRADLE_FILE"
fi
echo "Import handling complete. Current top of $GRADLE_FILE:"
head -n 5 "$GRADLE_FILE" # Print top 5 lines for verification

# Define content for signingConfigs block
echo "Defining SIGNING_CONFIG_BLOCK_CONTENT..."
SIGNING_CONFIG_BLOCK_CONTENT=$(cat << EOM
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
) # Corrected: Closing parenthesis on the same line as EOM or immediately after. For safety, EOM then ) on new line is fine, but EOM) is most common. Let's ensure EOM is truly alone.
# Standard heredoc to variable:
# VAR=$(cat <<EOF
# content
# EOF
# ) <--- This was the error. It should be:
# VAR=$(cat <<EOF
# content
# EOF
# )
# No, the error was `EOM\n)`. It should be `EOM\n)\n` or `EOM)`.
# Let's use the most standard form:
# SIGNING_CONFIG_BLOCK_CONTENT=$(cat <<EOM
# ...
# EOM
# )
# The `final_file_content` had `EOM\n)`. This is the syntax error.
# The `)` must be on the same line as the command part, or the command must be structured to expect it.
# `VAR=$( ... )`
# The `cat << EOM ... EOM` is the command. So the `)` should be after `EOM`.
# Corrected structure:
# SIGNING_CONFIG_BLOCK_CONTENT=$(cat <<EOM
# text
# EOM
# )
# The previous `final_file_content` had:
# EOM
# )
# This is the error. The `)` should be on the line with `EOM` or the `$(cat ...)` should be structured differently.
# The most robust is:
# SIGNING_CONFIG_BLOCK_CONTENT=$(cat << 'EOM_MARKER'
# ... content ...
# EOM_MARKER
# )
# Using a quoted heredoc marker also prevents any expansions inside the heredoc.
# And ensuring the closing parenthesis is correctly placed.

# Let's rewrite the assignment to be absolutely clear and robust:
SIGNING_CONFIG_BLOCK_CONTENT_TEMP=$(cat << 'EOM_DELIMITER'
    signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("../keystore.properties")
            val keystoreProperties = java.util.Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(java.io.FileInputStream(keystorePropertiesFile))
            }

            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["password"] as String
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["password"] as String
        }
    }
EOM_DELIMITER
)
SIGNING_CONFIG_BLOCK_CONTENT="$SIGNING_CONFIG_BLOCK_CONTENT_TEMP" # Assign to the original variable name
echo "SIGNING_CONFIG_BLOCK_CONTENT defined."

# Add signingConfigs block using awk
SIGNING_CONFIG_MARKER_START="// SIGNING_CONFIG_LIBRETV_START (do not modify or remove this line)"
SIGNING_CONFIG_MARKER_END="// SIGNING_CONFIG_LIBRETV_END (do not modify or remove this line)"

echo "Checking for signingConfigs block..."
if ! grep -Fq "$SIGNING_CONFIG_MARKER_START" "$GRADLE_FILE"; then
  echo "Attempting to add signingConfigs block..."
  awk -v marker_start="$SIGNING_CONFIG_MARKER_START" \
      -v marker_end="$SIGNING_CONFIG_MARKER_END" \
      -v block_content="$SIGNING_CONFIG_BLOCK_CONTENT" '
    BEGIN { android_block_found = 0; printed_block = 0; }
    /android *{/ { android_block_found = 1; }
    android_block_found && /buildTypes *{/ && !printed_block {
      print marker_start;
      print block_content;
      print marker_end;
      printed_block = 1; 
    }
    { print $0; }
  ' "$GRADLE_FILE" > "$TEMP_GRADLE_FILE"
  echo "awk for signingConfigs finished. Moving temp file."
  mv "$TEMP_GRADLE_FILE" "$GRADLE_FILE"
  echo "Added signingConfigs block to $GRADLE_FILE."
else
  echo "signingConfigs block already present in $GRADLE_FILE (marker found)."
fi
echo "signingConfigs block handling complete."

# Modify buildTypes.release to use the signingConfig
BUILD_TYPE_SIGNING_CONFIG_MARKER="// SIGNING_CONFIG_APPLIED_LIBRETV (do not modify or remove this line)"
SIGNING_CONFIG_LINE="            signingConfig = signingConfigs.getByName(\"release\")"

echo "Checking for buildTypes.release signingConfig..."
if ! grep -Fq "$BUILD_TYPE_SIGNING_CONFIG_MARKER" "$GRADLE_FILE"; then
  echo "Attempting to modify buildTypes for release signingConfig..."
  # Simpler awk: find the line with getByName("release") { and append after it.
  awk -v marker="$BUILD_TYPE_SIGNING_CONFIG_MARKER" \
      -v config_line="$SIGNING_CONFIG_LINE" '
    { print $0; } 
    /getByName\("release"\) *{/ {
      print config_line;
      print "            " marker;
    }
  ' "$GRADLE_FILE" > "$TEMP_GRADLE_FILE"
  echo "awk for buildTypes.release finished. Moving temp file."
  mv "$TEMP_GRADLE_FILE" "$GRADLE_FILE"
  echo "Configured release build type to use signingConfig in $GRADLE_FILE."
else
  echo "Release build type signingConfig already present in $GRADLE_FILE (marker found)."
fi
echo "buildTypes.release signingConfig handling complete."

echo "Finished modifying $GRADLE_FILE."
echo "--- Content of $GRADLE_FILE after modification: ---"
cat "$GRADLE_FILE"
echo "--- End of $GRADLE_FILE content ---"
