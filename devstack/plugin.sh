# plugin.sh - DevStack plugin.sh dispatch script app-catalog-ui

APP_CAT_UI_DIR=$(cd $(dirname $BASH_SOURCE)/.. && pwd)

function install_app-catalog-ui {
    sudo pip install --upgrade ${APP_CAT_UI_DIR}
    cp -a ${APP_CAT_UI_DIR}/app_catalog/static ${DEST}/horizon/
    cp -a ${APP_CAT_UI_DIR}/app_catalog/enabled/* ${DEST}/horizon/openstack_dashboard/enabled/
    python ${DEST}/horizon/manage.py compress --force
}

# check for service enabled
if is_service_enabled app-catalog-ui; then

    if [[ "$1" == "stack" && "$2" == "pre-install" ]]; then
        # Set up system services
        # no-op
        :

    elif [[ "$1" == "stack" && "$2" == "install" ]]; then
        # Perform installation of service source
        # no-op
        :

    elif [[ "$1" == "stack" && "$2" == "post-config" ]]; then
        # Configure after the other layer 1 and 2 services have been configured
        echo_summary "Installing App Catalog UI"
        install_app-catalog-ui

    elif [[ "$1" == "stack" && "$2" == "extra" ]]; then
        # Initialize and start the app-catalog-ui service
        # no-op
        :
    fi

    if [[ "$1" == "unstack" ]]; then
        # Shut down app-catalog-ui services
        # no-op
        :
    fi

    if [[ "$1" == "clean" ]]; then
        # Remove state and transient data
        # Remember clean.sh first calls unstack.sh
        # no-op
        :
    fi
fi
