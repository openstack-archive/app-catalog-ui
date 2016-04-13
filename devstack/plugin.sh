# plugin.sh - DevStack plugin.sh dispatch script app-catalog-ui

function install_app-catalog-ui {
    mv $APP_CAT_UI_DIR/test-requirements.txt $APP_CAT_UI_DIR/_test-requirements.txt

    setup_develop $APP_CAT_UI_DIR

    mv $APP_CAT_UI_DIR/_test-requirements.txt $APP_CAT_UI_DIR/test-requirements.txt

   setup_develop $APP_CAT_UI_DIR
}

function configure_app-catalog-ui {
    cp -a ${APP_CAT_UI_DIR}/app_catalog/enabled/* ${DEST}/horizon/openstack_dashboard/enabled/
}

# check for service enabled
if is_service_enabled app-catalog-ui; then

    if [[ "$1" == "stack" && "$2" == "pre-install" ]]; then
        # Set up system services
        # no-op
        :

    elif [[ "$1" == "stack" && "$2" == "install" ]]; then
        # Perform installation of service source
        echo_summary "Installing App Catalog UI"
        install_app-catalog-ui

    elif [[ "$1" == "stack" && "$2" == "post-config" ]]; then
        # Configure after the other layer 1 and 2 services have been configured
        echo_summary "Configuring App Catalog UI"
        configure_app-catalog-ui

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
        rm -f ${DEST}/horizon/openstack_dashboard/enabled/*_catalog_panel*.py*
    fi
fi
