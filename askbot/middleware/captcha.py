from django.http import HttpResponse
from PIL import Image, ImageDraw, ImageFont
from cStringIO import StringIO
from django.contrib.sessions.models import Session
from django.contrib.auth import SESSION_KEY
import random
import base64
import hashlib
import string

def get_md5_value(src):
    myMd5 = hashlib.md5()
    myMd5.update(src)
    myMd5_Digest = myMd5.hexdigest()
    return myMd5_Digest


# make a blank image for the text, initialized to transparent text color


class CaptchaMiddleware(object):

    def process_request(self, request):
        # print request.COOKIES

        user_cookie_name = "sessionid"
        if user_cookie_name in request.COOKIES:
            id = request.COOKIES.get(user_cookie_name)
            try:
                session = Session.objects.get(session_key=id)
                uid = session.get_decoded().get(SESSION_KEY)
                if uid:
                    return None
            except:
                pass

        if request.META.has_key('HTTP_X_FORWARDED_FOR'):
            ip = request.META['HTTP_X_FORWARDED_FOR']
        else:
            ip = request.META['REMOTE_ADDR']

        if 'robotask' in request.COOKIES and 'robotans' in request.COOKIES:
            ask = request.COOKIES['robotask']
            ans = request.COOKIES['robotans']
            if get_md5_value("_big_bobo_"+ask+ip)[0:8] == ans :
                return None
        if 'robotask' in request.COOKIES:
            del request.COOKIES['robotask']
        if 'robotans' in request.COOKIES:
            del request.COOKIES['robotans']
        candidates = "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ+-=~!@#$%^&*(){}|\\:;'\"<>?/.,"
        ask = ''.join(random.choice(candidates) for x in range(5))
        ans = get_md5_value("_big_bobo_"+ask+ip)[0:8]


        txt = Image.new('RGBA', (120, 26), (0,102,0,0))

        # get a font
        fnt = ImageFont.truetype('/usr/share/fonts/dejavu/DejaVuSans.ttf', 20)
        # get a drawing context
        d = ImageDraw.Draw(txt)
        # draw text, full opacity
        #d.text((0,0), get_md5_value("_"+"World")[0:8], font=fnt, fill=(255,255,255,255))

        d.text((0,0), ans, font=fnt, fill=(255,255,255,255))

        #out = Image.alpha_composite(base, txt)

        #txt.show()
        imagefile = StringIO()
        txt.save(imagefile, format='JPEG')
        imagedata = imagefile.getvalue()
        response = HttpResponse("<link rel='shortcut icon' href='/upfiles/favcon11.ico'><h2>your ip address is: "+ip+"</h2><h2>To ensure you are not a robot, please enter the text on the image:</h2><input style='font-size:20px' id='ans'/><img src='"+"data:image/jpeg;base64," + base64.b64encode(imagedata)+"' /><input style='font-size:28px' type=button onclick='document.cookie=\"robotans=\"+document.getElementById(\"ans\").value+\";expires=Thu, 01-Jan-2038 00:00:01 GMT;path=/\";window.location.reload();' value=go>")
        response.set_cookie("robotask", ask)
        return response
        # print (request.META['REMOTE_ADDR'])
        # print (request.path)

