#!/usr/bin/python3

from base64 import b64encode
from datetime import datetime
from itertools import chain
from os.path import dirname, join
from re import sub
from sys import argv
from typing import Callable, Iterable, Mapping, Match, Optional, Sequence, Tuple, Union
from urllib.request import urlopen
from zipfile import ZipFile, ZIP_DEFLATED

try:
    from scour.scour import getInOut as scourGetInOut, sanitizeOptions as scourSanitizeOptions, start as scourStart
except ImportError as ex:
    raise ImportError(f"{type(ex).__name__}: {ex}\n\nPlease install scour 0.36 or later: https://pypi.org/project/scour/\n")

DIRNAME = dirname(argv[0])

SVG_SOURCE = join('images', 'src', 'shtandart-src.svg')
SVG_OPTIMIZED = join('images', 'src', 'shtandart-opt.svg')
SVG_TARGET = join('images', 'shtandart.svg')

HTML_SOURCE = 'rigging.html'
HTML_TARGET = 'shtandart.html'
ZIP_TARGET = 'shtandart.zip'

BASE64 = 'BASE64'
NO_INDENT = ''

SCOUR_OPTIONS: Mapping[str, Union[bool, int, str]] = {
    'verbose': True,
    'digits': 5,
    'renderer_workaround': True,
    'strip_xml_prolog': True,
    'remove_titles': True,
    'remove_descriptions': True,
    'remove_metadata': True,
    'strip_comments': True,
    'embed_rasters': False,
    'enable_viewboxing': True,
    'indent_type': 'space',
    'indent_depth': 2,
    'strip_xml_space_attribute': True,
    'strip_ids': True,
    'protect_ids_noninkscape': True,
    'error_on_flowtext': True
}

SVG_PATTERNS: Sequence[Tuple[str, str]] = (
    (r'(?ms)\s*<style>.*?</style>(\n*)',
        r'\1'),
    (r'(?ms)\s*<g [^>]*id="(?:background|markup)"[^>]*>.*?</g>(\n*)',
        r'\1'),
    (r'(?ms)\s*<(?:g|g [^>]*)>\s*</g>(\n*)',
        r'\1'),
    (r' (?:color|fill-rule|filter|stroke-miterlimit|stroke-width|style)="\S+"',
        ''),
    (r' (?:fill|stroke)="#\S+"',
        ''),
    (r' (?:x|y)="0"',
        ''),
    (r' (?:height|width)="100%"',
        ''),
)

SubPattern = Union[str, Callable[[Match[str]], str]]

HTML_PATTERNS: Sequence[Tuple[str, SubPattern]] = (
    (r'([ \t]*)<link rel="stylesheet" href="(\S+)">',
        lambda match: loadFile(match, r'\1<style>\n%s\1</style>', 2)),
    (r'([ \t]*)<script src="(\S+)"></script>',
        lambda match: loadFile(match, r'\1<script>\n%s\1</script>', 2)),
    (r'(?s)(];\n)</script>\n[ \t]*<script>.*"use strict";\n',
        r'\1'),
    (r'([ \t]*)<object type="image/svg\+xml" data="(\S+)".*?></object>\n',
        lambda match: loadFile(match, r'%s', 2, NO_INDENT)),
    (r'type="(\S+)" href="(\S+?)(\?[^"]+)?"',
        lambda match: loadFile(match, r'type="\1" href="data:\1;base64,%s"', 2, BASE64)),
    (r'<img ([^<>]*) src="((\S+)\.(\S+?))(\?[^"]+)?"',
        lambda match: loadImage(match, r'<img \1 src="%s"', 2)),
    (r' url\("((\S+)\.(\S+?))(\?[^"]+)?"\)',
        lambda match: loadImage(match, r' url("%s")')),
    (r'(\sid="build">)\S+?(</)',
        lambda match: match.expand(rf'\1{datetime.utcnow().strftime("B%Y%m%d-%H%MG")}\2'))
)

def getFileName(fileName: str) -> str:
    return join(DIRNAME, fileName)

def scourSVG() -> None:
    options = scourSanitizeOptions()
    for (option, value) in chain(SCOUR_OPTIONS.items(), {'infilename': getFileName(SVG_SOURCE), 'outfilename': getFileName(SVG_OPTIMIZED)}.items()):
        setattr(options, option, value)
    (inputFile, outputFile) = scourGetInOut(scourSanitizeOptions(options))
    scourStart(options, inputFile, outputFile)

def loadFile(match: Match[str], replacePattern: str, fileNamePos: int, mode: Optional[str] = None) -> str:
    fileName = match.group(fileNamePos)
    print('F', fileName)
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

def loadImage(match: Match[str], pattern: str, fileNamePos: int = 1) -> str:
    fileName = match.group(fileNamePos)
    print('I', fileName)
    return match.expand(pattern % (f'data:image/{match.group(fileNamePos + 2).lower()};base64,{b64encode(open(getFileName(fileName), "rb").read()).decode()}'))

def cleanupFile(source: str, target: str, patterns: Iterable[Tuple[str, SubPattern]]) -> None:
    with open(getFileName(source), 'rb') as f:
        data = f.read().decode()
    for (pattern, replace) in patterns:
        newData = sub(pattern, replace, data)
        if newData != data:
            if not callable(replace):
                print('+', pattern)
        else:
            print('-', pattern)
        data = newData
    with open(getFileName(target), 'wb') as f:
        f.write(data.encode())

def createZip() -> None:
    with ZipFile(getFileName(ZIP_TARGET), 'w', ZIP_DEFLATED) as f:
        f.write(getFileName(HTML_TARGET))

def main() -> None:
    print("\nOptimizing SVG...")
    scourSVG()
    print("\nCleaning SVG...")
    cleanupFile(SVG_OPTIMIZED, SVG_TARGET, SVG_PATTERNS)
    print("\nCompiling HTML...")
    cleanupFile(HTML_SOURCE, HTML_TARGET, HTML_PATTERNS)
    print("\nCreating ZIP...")
    createZip()
    print("\nDONE")

if __name__ == '__main__':
    main()
