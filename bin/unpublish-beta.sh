#!/usr/bin/env bash

PACKAGE_NAME=$1
PACKAGE_VERSION=$2
ESCAPED_VERSION=$(printf '%s' "$PACKAGE_VERSION" | sed 's/\./\\./g')
VERSIONS=$(npm view $PACKAGE_NAME versions --json | jq -r '.[]')
BETA_VERSIONS=$(echo "$VERSIONS" | grep -E "$ESCAPED_VERSION-beta\.[0-9]+$" || echo "")

echo "$PACKAGE_NAME@$PACKAGE_VERSION"
echo "BETA_VERSIONS: $BETA_VERSIONS"

for VERSION in $BETA_VERSIONS; do
    echo "Unpublishing $VERSION"
    npm deprecate $PACKAGE_NAME@$VERSION "This is the beta version. Why can't it be deleted?" || echo ""
    npm unpublish $PACKAGE_NAME@$VERSION --force || echo ""
done
