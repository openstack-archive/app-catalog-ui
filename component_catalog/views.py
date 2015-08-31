from app_catalog.views import IndexView as ACView

class IndexView(ACView):
    # A very simple class-based view...
    template_name = 'component_catalog/index.html'

