=================================
 Enabling App Catalog in Devstack
=================================

1. Download DevStack

     > git clone https://git.openstack.org/openstack-dev/devstack
     > cd devstack

2. Add this repo as an external plugin repository::

     > cat local.conf
     [[local|localrc]]
     enable_plugin app-catalog-ui https://github.com/openstack/app-catalog-ui

3. Run ``stack.sh``
 
