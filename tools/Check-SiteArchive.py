"""Check both Sites input and expanded tar byte limits before publication."""
import argparse,gzip,json,pathlib,sys
LIMIT=256*1024*1024
def check(filename,limit=LIMIT):
    source=pathlib.Path(filename);size=source.stat().st_size
    if size>limit:return dict(archiveBytes=size,limitBytes=limit,fits=False,reason='input limit')
    with source.open('rb') as stream:compressed=stream.read(2)==b'\x1f\x8b'
    expanded=0
    with (gzip.open(source,'rb') if compressed else source.open('rb')) as stream:
        while block:=stream.read(1024*1024):
            expanded+=len(block)
            if expanded>limit:return dict(archiveBytes=size,expandedBytes=expanded,limitBytes=limit,fits=False,reason='expanded limit')
    return dict(archiveBytes=size,expandedBytes=expanded,limitBytes=limit,fits=True)
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('archive');args=parser.parse_args()
    result=check(args.archive);print(json.dumps(result));sys.exit(0 if result['fits'] else 1)
