def get_staticfiles_dirs(STATIC_URL):
    import xstatic.main
    import xstatic.pkg.app_catalog_common
    from openstack_dashboard.static_settings import get_staticfiles_dirs as gsfd  # noqa
    STATICFILES_DIRS = gsfd(STATIC_URL)
    STATICFILES_DIRS.extend([
        ('lib/app-catalog-common',
            xstatic.main.XStatic(xstatic.pkg.app_catalog_common,
                                 root_url=STATIC_URL).base_dir)
        ])
    return STATICFILES_DIRS
