from django.http import HttpResponse

class LogMiddleware(object):

    def process_request(self, request):
        # print request.COOKIES
        if 'iamnotarobot' in request.COOKIES :
            return None
        return HttpResponse("<button onclick='document.cookie=\"iamnotarobot=1 ;path=/\";window.location=window.location'>I am not a robot</button>")
        # print (request.META['REMOTE_ADDR'])
        # print (request.path)
