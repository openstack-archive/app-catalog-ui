#    Licensed under the Apache License, Version 2.0 (the "License"); you may
#    not use this file except in compliance with the License. You may obtain
#    a copy of the License at
#
#         http://www.apache.org/licenses/LICENSE-2.0
#
#    Unless required by applicable law or agreed to in writing, software
#    distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
#    WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
#    License for the specific language governing permissions and limitations
#    under the License.

from app_catalog.version import version_info as acvi
from django.conf import settings
from horizon import Horizon
from horizon.version import version_info as hvi
from horizon import views
from openstack_dashboard import api
import re

import json


class IndexView(views.APIView):
    # A very simple class-based view...
    template_name = 'app_catalog/index.html'

    def get_data(self, request, context, *args, **kwargs):
        has_murano = False
        try:
            Horizon.get_dashboard('murano')
            has_murano = True
        except Exception:
            pass
        regex = re.compile('(\d+\.\d+\.\d+)-?(.*)')
        heat_version = None
        heat_release = None
        try:
            info = api.heat.heatclient(
                request).build_info.build_info()['engine']['revision']
            match = regex.match(info)
            if match:
                heat_version = match.group(1)
                heat_release = match.group(0)
        except Exception:
            pass
        heat_version = getattr(settings,
                               'APP_CATALOG_HEAT_VERSION', heat_version)
        heat_release = getattr(settings,
                               'APP_CATALOG_HEAT_RELEASE', heat_release)
        murano_version = getattr(settings,
                                 'APP_CATALOG_MURANO_VERSION', None)
        murano_release = getattr(settings,
                                 'APP_CATALOG_MURANO_RELEASE', None)
        app_catalog_settings = {
            'HEAT_VERSION': {
                'VER': heat_version,
                'REL': heat_release
            },
            'HAS_MURANO': has_murano,
            'MURANO_VERSION': {
                'VER': murano_version,
                'REL': murano_release
            },
            'HORIZON_VERSION': {
                'VER': hvi.version_string(),
                'REL': hvi.release_string()
            },
            'APP_CATALOG_VERSION': {
                'VER': acvi.version_string(),
                'REL': acvi.release_string()
            },
            'APP_CATALOG_URL': getattr(settings,
                                       'APP_CATALOG_URL',
                                       '//apps.openstack.org')
        }
        context['APP_CATALOG_SETTINGS'] = json.dumps(app_catalog_settings)
        return context
