# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# The name of the panel to be added to HORIZON_CONFIG. Required.
PANEL = 'app_catalog_panel'
# The name of the dashboard the PANEL associated with. Required.
PANEL_DASHBOARD = 'project'
# The name of the panel group the PANEL is associated with.
PANEL_GROUP = 'catalog_panel_group'

# Python panel class of the PANEL to be added.
ADD_PANEL = 'app_catalog.panel.AppCatalog'

ADD_INSTALLED_APPS = ['app_catalog']

ADD_ANGULAR_MODULES = ['horizon.dashboard.project.app_catalog']

ADD_JS_FILES = [
  'dashboard/project/app_catalog/app_catalog.js'
]

ADD_SCSS_FILES = [
  'dashboard/project/app_catalog/app_catalog.scss'
]
