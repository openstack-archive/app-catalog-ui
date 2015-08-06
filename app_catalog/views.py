from horizon import views
from django.conf import settings


class IndexView(views.APIView):
    # A very simple class-based view...
    template_name = 'app_catalog/index.html'

    def get_data(self, request, context, *args, **kwargs):
        context['APP_CATALOG_URL'] = getattr(settings, 'APP_CATALOG_URL', 'https://apps.openstack.org')
        return context
