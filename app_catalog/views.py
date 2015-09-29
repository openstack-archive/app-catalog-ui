from horizon import Horizon
from horizon import views
from horizon.version import version_info as hvi
from app_catalog.version import version_info as acvi
from django.conf import settings
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
        except:
            pass
        regex = re.compile('(\d+\.\d+\.\d+)-?(.*)')
        heat_version = None
        heat_release = None
        try:
            info = api.heat.heatclient(request).build_info.build_info()['engine']['revision']
            match = regex.match(info)
            if match:
                heat_version = match.group(1)
                heat_release = match.group(0)
        except:
            pass
        heat_version = getattr(settings, 'APP_CATALOG_HEAT_VERSION', heat_version)
        heat_release = getattr(settings, 'APP_CATALOG_HEAT_RELEASE', heat_release)
        murano_version = getattr(settings, 'APP_CATALOG_MURANO_VERSION', None)
        murano_release = getattr(settings, 'APP_CATALOG_MURANO_RELEASE', None)
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
            'APP_CATALOG_URL': getattr(settings, 'APP_CATALOG_URL', '//apps.openstack.org')
        }
        context['APP_CATALOG_SETTINGS'] = json.dumps(app_catalog_settings)
        return context
