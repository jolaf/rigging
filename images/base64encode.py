#!/usr/bin/python
from base64 import b64encode
from sys import argv

def main():
    with open(argv[1], 'rb') as f:
        data = f.read()
    data = b64encode(data)
    with open(argv[1] + '.b64', 'w') as f:
        f.write(data)

main()
