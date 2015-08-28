from horizon import Horizon
from horizon import views
from django.conf import settings

import json

class IndexView(views.APIView):
    # A very simple class-based view...
    template_name = 'component_catalog/index.html'

    def get_data(self, request, context, *args, **kwargs):
        has_murano = False
        try:
            Horizon.get_dashboard('murano')
            has_murano = True
        except:
            pass
        app_catalog_settings = {
            'HAS_MURANO': has_murano,
            'APP_CATALOG_URL': getattr(settings, 'APP_CATALOG_URL', 'http://apps.openstack.org')
        }
        context['APP_CATALOG_SETTINGS'] = json.dumps(app_catalog_settings)
        return context

