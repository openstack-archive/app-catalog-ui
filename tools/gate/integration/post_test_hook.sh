#!/bin/bash

# This script will be executed inside post_test_hook function in devstack gate

set -x
source commons $@

set +e
cd /opt/stack/new/app-catalog-ui
sudo -H -u stack tox -e py27integration
retval=$?
set -e

if [ -d ${APP_CATALOG_SCREENSHOTS_DIR}/ ]; then
  cp -r ${APP_CATALOG_SCREENSHOTS_DIR}/ /home/jenkins/workspace/gate-app-catalog-ui-dsvm-integration/
fi
exit $retval
