from horizon import Horizon
from horizon import views
from horizon.version import version_info as hvi
from app_catalog.version import version_info as acvi
from django.conf import settings

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
        app_catalog_settings = {
            'HAS_MURANO': has_murano,
            'HORIZON_VERSION': {
                'VER': hvi.version_string(),
                'REL': hvi.release_string()
            },
            'APP_CATALOG_VERSION': {
                'VER': acvi.version_string(),
                'REL': acvi.release_string()
            },
            'APP_CATALOG_URL': getattr(settings, 'APP_CATALOG_URL', 'http://apps.openstack.org')
        }
        context['APP_CATALOG_SETTINGS'] = json.dumps(app_catalog_settings)
        return context
