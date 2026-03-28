#!/usr/bin/env bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOCAL_JDK_DIR="$PROJECT_DIR/.local-jdk"
GRADLE_HOME_DIR="$PROJECT_DIR/.gradle-home"

# Download JDK 11 locally if not present
if [ ! -d "$LOCAL_JDK_DIR" ]; then
    echo "Downloading JDK 11 locally into .local-jdk/ ..."
    mkdir -p "$LOCAL_JDK_DIR"

    OS="$(uname -s)"
    ARCH="$(uname -m)"

    case "$OS" in
        Linux)  JDK_OS="linux" ;;
        Darwin) JDK_OS="mac" ;;
        *)      echo "Unsupported OS: $OS"; exit 1 ;;
    esac

    case "$ARCH" in
        x86_64)  JDK_ARCH="x64" ;;
        aarch64|arm64) JDK_ARCH="aarch64" ;;
        *)       echo "Unsupported architecture: $ARCH"; exit 1 ;;
    esac

    URL="https://api.adoptium.net/v3/binary/latest/11/ga/${JDK_OS}/${JDK_ARCH}/jdk/hotspot/normal/eclipse"
    echo "Fetching from: $URL"

    curl -fL "$URL" -o "$LOCAL_JDK_DIR/jdk.tar.gz"
    tar -xzf "$LOCAL_JDK_DIR/jdk.tar.gz" -C "$LOCAL_JDK_DIR" --strip-components=1
    rm "$LOCAL_JDK_DIR/jdk.tar.gz"

    # On macOS the JDK is nested inside Contents/Home
    if [ -d "$LOCAL_JDK_DIR/Contents/Home" ]; then
        mv "$LOCAL_JDK_DIR/Contents/Home" "$LOCAL_JDK_DIR/.jdk-tmp"
        rm -rf "$LOCAL_JDK_DIR/Contents"
        mv "$LOCAL_JDK_DIR/.jdk-tmp"/* "$LOCAL_JDK_DIR/"
        rm -rf "$LOCAL_JDK_DIR/.jdk-tmp"
    fi

    echo "JDK 11 installed locally."
fi

export JAVA_HOME="$LOCAL_JDK_DIR"
export GRADLE_USER_HOME="$GRADLE_HOME_DIR"

exec "$PROJECT_DIR/gradlew" "$@"
