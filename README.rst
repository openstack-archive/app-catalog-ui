===============
apps-catalog-ui
===============

This makes the Appications and Components stored in the OpenStack Application
Catalog available to users in their own Cloud's Horizon UI.


Requirements
============

apps-catalog-ui is intended to use only on systems running Horizon


How to try this package
=======================

::

  git clone http://github.com/openstack/horizon.git
  git clone http://github.com/stackforge/apps-catalog-ui.git
  cd horizon
  ./run_tests.sh -f --docs
  cp ./openstack_dashboard/local/local_settings.py.example ./openstack_dashboard/local/local_settings.py
  pushd ../apps-catalog-ui
  ../horizon/tools/with_venv.sh pip install --upgrade .
  cp -a enabled/* ../horizon/openstack_dashboard/enabled/
  popd
  ./run_tests.sh --runserver 127.0.0.1:18000

* For Murano support, you need to patch the murano-dashboard plugin with:
https://review.openstack.org/#/c/218515/
