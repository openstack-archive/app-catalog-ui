# The name of the panel to be added to HORIZON_CONFIG. Required.
PANEL = 'app_catalog_panel'
# The name of the dashboard the PANEL associated with. Required.
PANEL_DASHBOARD = 'project'
# The name of the panel group the PANEL is associated with.
PANEL_GROUP = 'catalog_panel_group'

# Python panel class of the PANEL to be added.
ADD_PANEL = 'app_catalog.panel.AppCatalog'

ADD_INSTALLED_APPS = ['app_catalog']

ADD_ANGULAR_MODULES = ['hz.dashboard.project.app_catalog']

ADD_JS_FILES = [
  'dashboard/project/app_catalog/app_catalog.js'
]
