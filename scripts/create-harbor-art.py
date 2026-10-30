"""Author the Old Port plate. Standard-library only; not a runtime dependency.
The projection is shared with src/harbor-illustration.js. Original project art.
"""
from pathlib import Path
from math import sin, cos, pi
from random import Random

ROOT=Path(__file__).resolve().parent.parent
rng=Random(27)
S=15
YAW=-.62
ELEV=.63

def p(x,z,y=0):
 x,z=x+30,z-14
 return (690+(x*cos(YAW)-z*sin(YAW))*S,500+(x*sin(YAW)+z*cos(YAW))*sin(ELEV)*S-y*cos(ELEV)*S)
def pts(points): return ' '.join(f'{a:.2f},{b:.2f}' for a,b in points)
def poly(points,color,stroke='#345454',sw=.65,extra=''):
 return f'<polygon points="{pts(points)}" fill="{color}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" {extra}/>'
def plane(points,color,y=.7,**kw): return poly([p(x,z,y) for x,z in points],color,**kw)
def line(points,color,width=1.1,extra=''):
 return f'<polyline points="{pts(points)}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round" {extra}/>'
def wl(points,color,width=1.1,y=.72,extra=''):return line([p(x,z,y) for x,z in points],color,width,extra)
def ellipse(x,z,rx,rz,color,y=.71,extra=''):
 return plane([(x+cos(a*pi/20)*rx,z+sin(a*pi/20)*rz) for a in range(40)],color,y,stroke='none',extra=extra)
def box(x,z,w,d,h,col='#e5d6b2',y=.75):
 q=lambda xx,zz,yy:p(xx,zz,yy)
 a,b,c,e=[(x-w/2,z-d/2),(x+w/2,z-d/2),(x+w/2,z+d/2),(x-w/2,z+d/2)]
 return ''.join([poly([q(*e,y),q(*c,y),q(*c,y+h),q(*e,y+h)],col),poly([q(*b,y),q(*c,y),q(*c,y+h),q(*b,y+h)],'#b8b393'),poly([q(*a,y+h),q(*b,y+h),q(*c,y+h),q(*e,y+h)],'#e9dfbf')])
def roof(x,z,w,d,y,h,col):
 a,b,c,e=(x-w/2,z-d/2),(x+w/2,z-d/2),(x+w/2,z+d/2),(x-w/2,z+d/2)
 m,n=(x,z-d/2),(x,z+d/2)
 r=poly([p(*e,y),p(*c,y),p(*n,y+h)],'#d5c29c')
 r+=poly([p(*a,y),p(*m,y+h),p(*n,y+h),p(*e,y)],col)
 r+=poly([p(*m,y+h),p(*b,y),p(*c,y),p(*n,y+h)],'#536e69' if col=='#658783' else '#935f4b')
 for side in [-1,1]:
  for row in range(1,6):
   f=row/6
   r+=line([p(x+side*w*.5*f,z-d/2,y+h*(1-f)),p(x+side*w*.5*f,z+d/2,y+h*(1-f))],'#e8c79a' if side<0 else '#d5b18b',.65,extra='opacity=".36"')
   for k in range(9):
    zz=z-d/2+d*(k+.5*(row%2))/9
    if zz>z+d/2:continue
    r+=line([p(x+side*w*.5*f,zz,y+h*(1-f)),p(x+side*w*.5*(f-1/6),zz,y+h*(1-f+1/6))],'#293f3e',.6,extra='opacity=".2"')
 r+=line([p(*m,y+h+.04),p(*n,y+h+.04)],'#314e4e',2)
 return r

def window(x,z,y,w=.85,h=1.15,side=False):
 if side: q=lambda xx,yy:p(x,z+xx,yy)
 else:q=lambda xx,yy:p(x+xx,z,yy)
 r=poly([q(-w/2,y),q(w/2,y),q(w/2,y+h),q(-w/2,y+h)],'#31565f',stroke='#f0dfb6',sw=2)
 r+=line([q(-w/2,y+h*.46),q(w/2,y+h*.46)],'#ddcfab',1.2)
 r+=line([q(0,y),q(0,y+h)],'#ddcfab',1.2)
 r+=line([q(-w*.67,y-.12),q(w*.67,y-.12)],'#ac8c64',3)
 r+=poly([q(-w*.38,y+h*.1),q(-w*.2,y+h*.12),q(w*.2,y+h*.84),q(w*.06,y+h*.86)],'#b4d3cf',stroke='none',extra='opacity=".32"')
 return r

def house(x,z,w,d,h,roofcol='#b47555',shop=False):
 r=ellipse(x+2,z+1.3,w*.9,d*.8,'#4d6d62',extra='opacity=".18"')
 r+=box(x,z,w,d,h)
 for j in range(int(h/.3)):
  r+=line([p(x-w/2,z+d/2,h*.03+.85+j*.29),p(x+w/2,z+d/2,h*.03+.85+j*.29)],'#a69272',.6,extra='opacity=".32"')
 for xx in [-w*.28,w*.28]:r+=window(x+xx,z+d/2+.03,1.7)
 for zz in [-d*.25,d*.25]:r+=window(x+w/2+.03,z+zz,1.65,.75,1.15,True)
 r+=poly([p(x+w/2+.06,z-.52,.8),p(x+w/2+.06,z+.52,.8),p(x+w/2+.06,z+.52,3.05),p(x+w/2+.06,z-.52,3.05)],'#47645f',stroke='#d5c09b',sw=1.4)
 for yy in [.8,1.1,1.4]:r+=box(x+w/2+.25+(1.4-yy)*.65,z, .6,1.35,.18,'#c2b08b',yy-.1)
 r+=roof(x,z,w+.7,d+.65,h+.75,2.1,roofcol)
 r+=box(x-w*.24,z-d*.16,.65,.65,1.7,'#b6a78d',h+1.25)
 for xx in [-w*.28,w*.28]:
  r+=box(x+xx,z+d/2+.25,1.2,.4,.26,'#a5724f',1.35)
  for k in range(5):
   a,b=p(x+xx-.45+k*.22,z+d/2+.3,1.75)
   r+=f'<circle cx="{a:.2f}" cy="{b:.2f}" r="{2+k%2}" fill="{["#b0b178","#e0b673","#809967"][k%3]}"/>'
 if shop:
  r+=plane([(x+1,z+1),(x+3.6,z+1),(x+3.6,z+5),(x+1,z+5)],'#c6b895',1,stroke='none')
  for xx,zz in [(x+2,z+4.4),(x-2,z+4.4)]:r+=line([p(xx,zz,.8),p(xx,zz,3.1)],'#6a6a50',3)
  r+=poly([p(x-2.8,z+2.6,3.6),p(x+2.8,z+2.6,3.6),p(x+2.8,z+4.7,3.1),p(x-2.8,z+4.7,3.1)],'#c8a66c')
  for i in range(7):
   xx=x-2.8+i*.8
   r+=poly([p(xx,z+2.6,3.61),p(xx+.4,z+2.6,3.61),p(xx+.4,z+4.7,3.11),p(xx,z+4.7,3.11)],'#e8d5a7',stroke='none')
 return r

def tree(x,z,s=1):
 a,b=p(x,z)
 r=ellipse(x+1.2*s,z+.8,s*2,s*1.3,'#395c52',extra='opacity=".15"')
 r+=line([p(x,z,.8),p(x+.08,z,4.2*s)],'#766a4c',3*s)
 r+=line([p(x,z,2.2*s),p(x-.7*s,z,3.5*s)],'#766a4c',2*s)
 for dx,dz,yy,rx,ry,col in [(0,0,4.9,21,28,'#78936b'),(-.85,.3,3.8,18,22,'#8ca372'),(.8,0,4.1,18,25,'#557c66'),(.2,-.2,5.5,17,20,'#a2af7c')]:
  a,b=p(x+dx*s,z+dz*s,yy*s)
  r+=f'<ellipse cx="{a:.2f}" cy="{b:.2f}" rx="{rx*s}" ry="{ry*s}" fill="{col}"/>'
 return r

def crate(x,z,s=1,y=.8):
 r=box(x,z,s,s*.8,s*.8,'#c6a06c',y)
 for n in [-.34,.34]:r+=line([p(x+n*s,z+s*.41,y),p(x+n*s,z+s*.41,y+s*.8)],'#e1bd81',1.5)
 r+=line([p(x-s*.45,z+s*.41,y+.1),p(x+s*.45,z+s*.41,y+s*.7)],'#8f7653',1.1)
 return r

def barrel(x,z,y=.8):
 a,b=p(x,z,y)
 return f'<g transform="translate({a:.2f} {b:.2f})"><path d="M-7-3Q-10-12-7-21Q0-25 7-21Q10-12 7-3Q0 1-7-3Z" fill="#a3845b" stroke="#57645b" stroke-width=".7"/><ellipse cy="-21" rx="7" ry="3" fill="#d0b17d"/><path d="M-8-16Q0-12 8-16M-8-7Q0-3 8-7" fill="none" stroke="#58665c" stroke-width="2"/></g>'

coast=[(-45+cos(i/80*2*pi)*18,-45*0+8+sin(i/80*2*pi)*25) for i in range(80)]
art=['''<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1000" viewBox="0 0 1440 1000"><title>Старый порт: почтовый причал, мастерская и часовая башня</title><defs><linearGradient id="sea" x2=".7" y2="1"><stop stop-color="#609197"/><stop offset="1" stop-color="#396f7a"/></linearGradient><linearGradient id="grass" x2="1" y2="1"><stop stop-color="#acb58a"/><stop offset="1" stop-color="#8e9e77"/></linearGradient><pattern id="stone" width="42" height="22" patternUnits="userSpaceOnUse"><path d="M0 1H42M0 22H42M20 0v12M0 12h42M8 12v10M35 12v10" fill="none" stroke="#c6b893" stroke-width=".8" opacity=".45"/></pattern></defs>''']
# Subtle currents keep the shipping water calm.
for i in range(70):
 x,y=rng.uniform(60,1420),rng.uniform(140,920)
 art.append(f'<path d="M{x:.1f} {y:.1f}q12-3 25 0t22 0" stroke="#c8ddd4" stroke-width="1" opacity="{rng.uniform(.05,.13):.2f}" fill="none"/>')
art.append(ellipse(-45,8,20.2,27,'#b5c3a4',y=-.3,extra='opacity=".12"'))
art.append(ellipse(-45,8,19.1,26.1,'#c4c8a3',y=-.15,extra='opacity=".16"'))
for i in range(80):
 a,b=coast[i],coast[(i+1)%80]
 art.append(poly([p(*a,-.55),p(*b,-.55),p(*b,.75),p(*a,.75)],['#9c9f86','#a7a38a','#b0aa8c'][i%3],stroke='none'))
art.append(plane(coast,'#d2c09a',.76,stroke='#d5cfad',sw=1.5))
art.append(plane([(-45+(x+45)*.94,8+(z-8)*.95) for x,z in coast],'url(#grass)',.78,stroke='none'))
# Walkable paths and small paving seams.
for path,w in [([(-55,-8),(-44,-7),(-35,0),(-29,6),(-25,16)],20),([(-51,21),(-42,23),(-34,16),(-26,16)],17),([(-43,-6),(-43,10),(-42,23)],16)]:
 art.append(wl(path,'#c6b594',w))
 art.append(wl(path,'#ddcda8',w*.68,extra='opacity=".5"'))
# Quay apron, drawn to the same world footprint as the navigation model.
art.append(plane([(-30,10),(-21,10),(-21,22),(-30,22)],'#b4a57e',.82))
for i in range(27):
 z=10+i*12/27
 art.append(wl([(-30,z),(-21,z)],'#dfc494' if i%3==0 else '#857f61',.8,y=.84))
art.append(wl([(-21,10),(-21,22),(-30,22)],'#645f4b',3,y=.83))
for z in [10.4,14.2,18,21.5]:
 a,b=p(-21,z,.75)
 art.append(f'<ellipse cx="{a}" cy="{b+8}" rx="4" ry="9" fill="#355b5b"/><ellipse cx="{a}" cy="{b}" rx="5" ry="3" fill="#7e8a74"/>')
for z in [11.4,17.3,21.2]:
 a,b=p(-21.5,z,1)
 art.append(f'<g transform="translate({a} {b})"><path d="M-3 0v-7h6v7" fill="#3d5956"/><ellipse cy="-7" rx="6" ry="2" fill="#405954"/></g>')
# Foreground pieces have a stable authored depth order.
objects=[]
def item(x,z,body):objects.append((p(x,z)[1],body))
item(-48,-9,tree(-48,-9,.95))
item(-56,0,tree(-56,0,1.35))
item(-50,8,tree(-50,8,1.05))
item(-54,18,tree(-54,18,1.2))
item(-43,-6,house(-43,-6,5.6,4.8,4.2,'#658783'))
item(-35,0,house(-35,0,6.5,6,4.1,'#658783',True))
item(-43,11,house(-43,11,7,5.3,4.6,'#b47555'))
item(-43,24,house(-43,24,6.6,5.4,3.6,'#658783'))
item(-33,27,tree(-33,27,.88))
# Clock tower, the port's landmark (not a navigation light).
x,z=-47,-5
body=box(x,z,2.9,2.9,10.7,'#ded1ae')+roof(x,z,3.7,3.7,11.45,2.2,'#658783')
body+=window(x+1.48,z,4.7,.5,1.45,True)
a,b=p(x,z+1.49,9.3)
body+=f'<g transform="translate({a:.2f} {b:.2f})"><circle r="11" fill="#f3e5c4" stroke="#5a6a5b" stroke-width="2"/><path d="M0-7v7l5 3" fill="none" stroke="#4e6158" stroke-width="1.5"/><circle r="1.5" fill="#4e6158"/></g>'
item(x,z,body)
# Mail awning and a little sorting table on the cargo apron.
body=''
for x,z in [(-27.5,11),(-23.4,11),(-27.5,14.1),(-23.4,14.1)]:body+=line([p(x,z,.8),p(x,z,3.65)],'#746e52',2.8)
body+=plane([(-27.9,10.7),(-23,10.7),(-23,14.4),(-27.9,14.4)],'#d9be82',3.75)
for i in range(6):
 x=-27.9+i*.82
 body+=plane([(x,10.7),(x+.32,10.7),(x+.32,14.4),(x,14.4)],'#efe0b8',3.76,stroke='none')
body+=box(-25.5,13,2.6,1.1,1,'#a6845b')
for x,z in [(-27,15.5),(-26.3,16.8),(-27.7,17.1)]:body+=crate(x,z,1.3)
body+=crate(-27,15.5,1.1,1.85)
item(-25,13,body)
for x,z in [(-27,20.5),(-25.5,20.8),(-30.2,4)]:item(x,z,barrel(x,z))
# Bench, ropes, workbench, spare spars and a boat on trestles.
body=box(-32,2.5,2.3,1.2,1.2,'#a38a64')
for i in range(6):body+=wl([(-33+i*.25,2.2),(-31.3+i*.25,2.2)],'#dbbd83',1.8,y=2.1+i*.06)
item(-32,2.5,body)
body=box(-33,13,.4,3,.8,'#647c6b')+box(-31.7,13,.4,3,.8,'#647c6b')+box(-32.4,13,1.7,3,.2,'#bf9c6e',1.5)
item(-32,13,body)
for x,z in [(-28,19),(-24,20.5)]:
 a,b=p(x,z,.94)
 item(x,z,f'<g transform="translate({a} {b}) rotate(18)" fill="none" stroke="#b7ac7b" stroke-width="1.5"><ellipse rx="9" ry="4"/><ellipse rx="6" ry="2.5"/><path d="M8 0q14 4 18-3"/></g>')
# Raised garden with plants, fences and fruit crates.
body=plane([(-51,22),(-46,22),(-46,26),(-51,26)],'#857c5a',.83)
for i in range(5):
 xx=-50.6+i
 body+=wl([(xx,22.4),(xx,25.6)],'#b1a077',3,y=.85)
 for j in range(4):body+=ellipse(xx,22.8+j*.75,.28,.28,'#a3b17a',1)
item(-48,24,body)
for x,z in [(-51,27),(-49,27),(-47,27)]:item(x,z,crate(x,z,.9))
# Simple stone steps connect the path to the quay.
for i in range(5):item(-30.5+i*.35,15,box(-30.5+i*.35,15,.5,2,.15,'#ccbc98',.78))
# Bushes and grass stay within the coast, away from the water lane.
for i in range(28):
 x,z=rng.uniform(-58,-32),rng.uniform(-12,30)
 if ((x+45)/16)**2+((z-8)/23)**2>.85:continue
 if abs(x+43)<6 or abs(x+35)<5:continue
 item(x,z,ellipse(x,z,.65,.5,'#84976f',.82)+tree(x,z,.35))
for _,body in sorted(objects,key=lambda a:a[0]):art.append(body)
# Small foreground sea grass, no screen-wide grain or expensive filters.
art.append('</svg>')
from xml.etree.ElementTree import fromstring
source='\n'.join(art)
fromstring(source)
(ROOT/'assets/harbor/old-port.svg').write_text(source)
print('Created assets/harbor/old-port.svg')
