#!/usr/bin/python
from base64 import b64encode
from re import sub as reSub
from datetime import datetime
from urllib2 import urlopen
from zipfile import ZipFile

SOURCE = 'rigging.html'
TARGET = 'shtandart.html'
ZIP = 'shtandart.zip'

BASE64 = 'BASE64'
JOIN_LINES = 'JOIN_LINES'
INDENT = '  '
NO_INDENT = ''

def loadFile(match, replacePattern, fileNamePos, mode = None):
    print match.groups()
    fileName = match.group(fileNamePos)
    if fileName.startswith('http'):
        data = urlopen(fileName).read()
    else:
        data = open(fileName, 'rb').read()
    if mode is BASE64:
        data = b64encode(data)
    else:
        if fileName.endswith('.js'):
            data = data.replace('\\', '\\\\')
        if mode is JOIN_LINES:
            data = ''.join(data.splitlines())
        elif mode is not None:
            indent = match.group(1)
            linePattern = '%s\n'
            indentedPattern = ''.join((indent if indent and not indent.strip() else '', mode, linePattern))
            data = ''.join(((linePattern if line.startswith('\t') else indentedPattern) % line) if line.strip() else '\n' for line in data.splitlines())
    return match.expand(replacePattern % data)

def loadImage(match, pattern, fileNamePos = 1):
    print match.groups()
    return match.expand(pattern % ('data:image/%s;base64,%s' % (match.group(fileNamePos + 2).lower(), b64encode(open(match.group(fileNamePos), 'rb').read()))))

PATTERNS = ((r'([ \t]*)<link rel="stylesheet" type="(\S+)" href="(\S+)">', lambda match: loadFile(match, r'\1<style type="\2">\n%s\1</style>', 3)),
            (r'([ \t]*)<script type="(\S+)" src="(\S+)"></script>', lambda match: loadFile(match, r'\1<script type="\2">\n%s\1</script>', 3)),
            (r'(?s)(];\n)</script>\n[ \t]*<script type="\S+">.*"use strict";\n', r'\1'),
            (r'([ \t]*)<object type="image/svg\+xml" data="(\S+)".*?></object>\n', lambda match: loadFile(match, r'%s', 2, NO_INDENT)),
            (r'(?s)([ \t]*)(scheme = \$\(svgSelector\);).*?\n\1}', r'\1\2'),
            (r'type="(\S+)" href="(\S+)"', lambda match: loadFile(match, r'type="\1" href="data:\1;base64,%s"', 2, BASE64)),
            (r'<img ([^<>]*) src="((\S+)\.(\S+))"', lambda match: loadImage(match, r'<img \1 src="%s"', 2)),
            (r' url\("((\S+)\.(\S+))"\)', lambda match: loadImage(match, r' url("%s")')),
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
