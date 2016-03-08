#!/bin/bash

# This script will be executed inside pre_test_hook function in devstack gate

set -ex

DIR=${BASH_SOURCE%/*}
source $DIR/commons $@