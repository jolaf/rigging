#!/usr/bin/python
from re import sub as reSub

SOURCE = 'shtandart-opt.svg'
TARGET = 'shtandart.svg'

PATTERNS = ((r'(?ms)\s*<metadata>.*?</metadata>(\n*)', r'\1'),
            (r'(?ms)\s*<g></g>(\n*)', r'\1'),
            (r' (fill-rule|filter|stroke-miterlimit|stroke-width|style)="\S+"', ''),
            (r' (height|width)="100%"', ''),
            (r' (x|y)="0"', ''),
            (r' ((deck|side|rail|mast|isAcross|ignoreDeck)=")', r' rigging:\1'),
            #('  ', ' '),
            (r'\n\n', r'\n'))

def main():
    with open(SOURCE, 'r') as f:
        data = f.read()
    for (pattern, replace) in PATTERNS:
        data = reSub(pattern, replace, data)
    with open(TARGET, 'w') as f:
        f.write(data)

main()
