#!/usr/bin/python
from base64 import b64encode
from re import sub as reSub

SOURCE = 'rigging.html'
TARGET = 'shtandart.html'

def loadFile(match, pattern, fileNamePos, base64 = False):
    print match.groups()
    data = open(match.group(fileNamePos), 'rb').read()
    if base64:
        data = b64encode(data)
    return match.expand(pattern % data)

def loadImage(match, pattern, fileNamePos = 1):
    print match.groups()
    return match.expand(pattern % ('image/%s' % match.group(fileNamePos + 2).lower(), b64encode(open(match.group(fileNamePos), 'rb').read())))

PATTERNS = ((r'([ \t]*)<link rel="stylesheet" type="(\S+)" href="(\S+)">', lambda match: loadFile(match, r'\1<style type="\2">\n%s\1</style>', 3)),
            (r'([ \t]*)<script type="(\S+)" src="(\S*jquery\S+)"></script>', lambda match: loadFile(match, r'\1<!-- \3 -->\n\1<script type="\2" src="data:\2;base64,%s"></script>', 3, True)),
            (r'([ \t]*)<script type="(\S+)" src="((?!data:)\S+)"></script>', lambda match: loadFile(match, r'\1<script type="\2">\n%s\1</script>', 3)),
            (r'type="(\S+)" href="(\S+)"', lambda match: loadFile(match, r'type="\1" href="data:\1;base64,%s"', 2, True)),
            (r'<img ([^<>]*) src="((\S+)\.(\S+))"', lambda match: loadImage(match, r'<img \1 src="data:%s;base64,%s"', 2)),
            (r' url\("((\S+)\.(\S+))"\)', lambda match: loadImage(match, r' url("data:%s;base64,%s")')))

def main():
    with open(SOURCE, 'rb') as f:
        data = f.read()
    for (pattern, replace) in PATTERNS:
        data = reSub(pattern, replace, data)
    with open(TARGET, 'wb') as f:
        f.write(data)

main()
