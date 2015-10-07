==============
app-catalog-ui
==============

This makes the Applications and Components stored in the OpenStack Application
Catalog available to users in their own Cloud's Horizon UI.


Requirements
============

app-catalog-ui is intended to use only on systems running Horizon


How to try this package
=======================

With Devstack
-------------
Add the following to your Devstack local.conf file

::

  enable_plugin app-catalog-ui https://git.openstack.org/openstack/app-catalog-ui

With Horizon
------------

::

  git clone http://github.com/openstack/horizon.git
  git clone http://github.com/openstack/app-catalog-ui.git
  cd horizon
  ./run_tests.sh -f --docs
  cp ./openstack_dashboard/local/local_settings.py.example ./openstack_dashboard/local/local_settings.py
  pushd ../apps-catalog-ui
  ../horizon/tools/with_venv.sh pip install --upgrade .
  cp -a app_catalog/enabled/* ../horizon/openstack_dashboard/enabled/
  popd

  #FOR Murano Dashboard support:
  git clone http://github.com/openstack/murano-dashboard.git
  pushd ../murano-dashboard
  ../horizon/tools/with_venv.sh pip install --upgrade .
  cp muranodashboard/local/_50_murano.py ../horizon/openstack_dashboard/enabled/
  popd

  #If you want to test against you own app-catalog checkout:
  echo "APP_CATALOG_URL='http://localhost:18001'" >> openstack_dashboard/local/local_settings.py

  #Start test server
  ./run_tests.sh --runserver 127.0.0.1:18000
