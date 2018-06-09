#!/usr/bin/python3

from base64 import b64encode
from datetime import datetime
from os.path import dirname, join
from re import sub
from sys import argv
from urllib.request import urlopen
from zipfile import ZipFile, ZIP_DEFLATED

DIRNAME = dirname(argv[0])

SOURCE = 'rigging.html'
TARGET = 'shtandart.html'
ZIP_TARGET = 'shtandart.zip'

BASE64 = 'BASE64'
NO_INDENT = ''

def getFileName(fileName):
    return join(DIRNAME, fileName)

def loadFile(match, replacePattern, fileNamePos, mode = None):
    print(match.groups())
    fileName = match.group(fileNamePos)
    if fileName.startswith('http'):
        data = urlopen(fileName.replace('jquery.js', 'jquery.slim.min.js')).read()
    else:
        data = open(getFileName(fileName), 'rb').read()
    if mode is BASE64:
        data = b64encode(data).decode()
    else:
        data = data.decode()
        if fileName.endswith('.js'):
            data = data.replace('\\', '\\\\')
        if mode is not None:
            indent = match.group(1)
            linePattern = '%s\n'
            indentedPattern = ''.join((indent if indent and not indent.strip() else '', mode, linePattern))
            data = ''.join(((linePattern if line.startswith('\t') else indentedPattern) % line) if line.strip() else '\n' for line in data.splitlines())
    return match.expand(replacePattern % data)

def loadImage(match, pattern, fileNamePos = 1):
    print(match.groups())
    return match.expand(pattern % ('data:image/%s;base64,%s' % (match.group(fileNamePos + 2).lower(), b64encode(open(getFileName(match.group(fileNamePos)), 'rb').read()).decode())))

PATTERNS = ((r'([ \t]*)<link rel="stylesheet" type="(\S+)" href="(\S+)">',
                lambda match: loadFile(match, r'\1<style type="\2">\n%s\1</style>', 3)),
            (r'([ \t]*)<script type="(\S+)" src="(\S+)"></script>',
                lambda match: loadFile(match, r'\1<script type="\2">\n%s\1</script>', 3)),
            (r'(?s)(];\n)</script>\n[ \t]*<script type="\S+">.*"use strict";\n',
                r'\1'),
            (r'([ \t]*)<object type="image/svg\+xml" data="(\S+)".*?></object>\n',
                lambda match: loadFile(match, r'%s', 2, NO_INDENT)),
            (r'(?s)([ \t]*)(scheme = \$\(\'#schemeBlock svg\'\);).*?\n\1}', r'\1\2'),
            (r'type="(\S+)" href="(\S+)"',
                lambda match: loadFile(match, r'type="\1" href="data:\1;base64,%s"', 2, BASE64)),
            (r'<img ([^<>]*) src="((\S+)\.(\S+))"',
                lambda match: loadImage(match, r'<img \1 src="%s"', 2)),
            (r' url\("((\S+)\.(\S+))"\)',
                lambda match: loadImage(match, r' url("%s")')),
            (r'(\sid="build">)\S+?(</)',
                lambda match: match.expand(r'\1%s\2' % datetime.utcnow().strftime('b%Y%m%d-%H%MG'))))

def compileHTML():
    with open(getFileName(SOURCE), 'rb') as f:
        data = f.read().decode()
    for (pattern, replace) in PATTERNS:
        data = sub(pattern, replace, data)
    with open(getFileName(TARGET), 'wb') as f:
        f.write(data.encode())
    with ZipFile(getFileName(ZIP_TARGET), 'w', ZIP_DEFLATED) as f:
        f.write(getFileName(TARGET))

def main():
    compileHTML()

main()
