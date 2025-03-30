from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.contrib.auth.decorators import user_passes_test


def builder_required(view_func):
    decorated_view = user_passes_test(lambda u: u.permissions.check("Builder"))(
        view_func
    )
    return decorated_view


@builder_required
def editor(request):
    return render(request, "editor.html")
