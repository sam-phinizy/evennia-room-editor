"""
This reroutes from an URL to a python view-function/class.

The main web/urls.py includes these routes for all urls (the root of the url)
so it can reroute to all website pages.

"""

from django.urls import path

from evennia.web.website.urls import urlpatterns as evennia_website_urlpatterns
from web.website import editor
from web.website.editor_api import api

# add patterns here
urlpatterns = [
    path(r"editor", editor.editor, name="Editor"),
    path(r"editor-api/", api.urls),
]

# read by Django
urlpatterns = urlpatterns + evennia_website_urlpatterns
