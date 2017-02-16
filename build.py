#!/usr/bin/python
from base64 import b64encode
from re import sub as reSub
from datetime import datetime
from urllib2 import urlopen
from zipfile import ZipFile

SOURCE = 'rigging.html'
TARGET = 'shtandart.html'
ZIP = 'shtandart.zip'

def loadFile(match, replacePattern, fileNamePos, base64 = False, prefix = None):
    print match.groups()
    fileName = match.group(fileNamePos)
    if fileName.startswith('http'):
        data = urlopen(fileName).read()
    else:
        data = open(fileName, 'rb').read()
    if base64:
        data = b64encode(data)
    elif fileName.endswith('.js'):
        data = data.replace(r'\\', r'\\\\')
    if not base64 and prefix is not None:
        indent = match.group(1)
        linePattern = ''.join((indent if indent and not indent.strip() else '', prefix, '%s\n'))
        data = ''.join((linePattern % line) if line.strip() else '\n' for line in data.splitlines())
    return match.expand(replacePattern % data)

def loadImage(match, pattern, fileNamePos = 1):
    print match.groups()
    return match.expand(pattern % ('image/%s' % match.group(fileNamePos + 2).lower(), b64encode(open(match.group(fileNamePos), 'rb').read())))

PATTERNS = ((r'([ \t]*)<link rel="stylesheet" type="(\S+)" href="(\S+)">', lambda match: loadFile(match, r'\1<style type="\2">\n%s\1</style>', 3, prefix = '  ')),
            (r'([ \t]*)<script type="(\S+)" src="(\S*jquery\S+)"></script>', lambda match: loadFile(match, r'\1<!-- \3 -->\n\1<script type="\2" src="data:\2;base64,%s"></script>', 3, base64 = True)),
            (r'([ \t]*)<script type="(\S+)" src="((?!data:)\S+)"></script>', lambda match: loadFile(match, r'\1<script type="\2">\n%s\1</script>', 3, prefix = '  ')),
            (r'([ \t]*)<object type="image/svg\+xml" data="(\S+)".*?></object>\n', lambda match: loadFile(match, r'%s', 2, prefix = '')),
            (r'(?s)([ \t]*)(scheme = \$\(svgSelector\);).*?\n\1}', r'\1\2'),
            (r'type="(\S+)" href="(\S+)"', lambda match: loadFile(match, r'type="\1" href="data:\1;base64,%s"', 2, base64 = True)),
            (r'<img ([^<>]*) src="((\S+)\.(\S+))"', lambda match: loadImage(match, r'<img \1 src="data:%s;base64,%s"', 2)),
            (r' url\("((\S+)\.(\S+))"\)', lambda match: loadImage(match, r' url("data:%s;base64,%s")')),
            (r'(?s)\n</script>\n[ \t]*<script type="\S+">.*"use strict";\n', r'\n'),
            (r'(\sid="build">)\S+?(</)', lambda match: match.expand(r'\1%s\2' % datetime.utcnow().strftime('b%Y%m%d-%H%MG'))))

def main():
    with open(SOURCE, 'rb') as f:
        data = f.read()
    for (pattern, replace) in PATTERNS:
        data = reSub(pattern, replace, data)
    with open(TARGET, 'wb') as f:
        f.write(data)
    with ZipFile(ZIP, 'w') as f:
        f.write(TARGET)

main()
