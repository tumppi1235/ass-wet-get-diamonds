"""Compact runtime copy of the audited graph. Canonical inputs are never changed."""
import argparse, gzip, hashlib, json, pathlib
SOURCE_SHA = 'e16d062504f74c74585ac1538654daedac7cb74add4015f4d217bb6c8104e295'
def dumps(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()
def digest(value):
    return hashlib.sha256(value).hexdigest()
def pack_edge(edge):
    flat=[]; previous=[0,0,0]
    for point in edge['points']:
        if len(point)!=3 or any(type(n) is not int or abs(n)>9007199254740991 for n in point):
            raise ValueError('Invalid source node')
        flat.extend(point[i]-previous[i] for i in range(3)); previous=point
    return [edge['id'],edge['way'],edge['f'],edge['b'],flat]
def unpack_points(flat):
    points=[]; previous=[0,0,0]
    for i in range(0,len(flat),3):
        previous=[previous[j]+flat[i+j] for j in range(3)]; points.append(previous)
    return points
def pack_network(source, output, expected_sha=SOURCE_SHA):
    source=pathlib.Path(source).resolve();output=pathlib.Path(output).resolve()
    if source==output or source in output.parents or output in source.parents:
        raise ValueError('Use a separate runtime output directory')
    raw=(source/'manifest.json').read_bytes()
    if digest(raw)!=expected_sha: raise ValueError('Source manifest checksum mismatch')
    manifest=json.loads(raw)
    if manifest['version']!=1 or manifest['policy']!='finland-paths-dev-1': raise ValueError('Unsupported source')
    output.mkdir(parents=True,exist_ok=False)
    chunks={};original=total=points=edges=0
    for key,info in sorted(manifest['chunks'].items()):
        if not all(part.isdecimal() for part in key.split('_')) or len(key.split('_'))!=2:
            raise ValueError('Invalid cell key')
        data=(source/(key+'.json.gz')).read_bytes()
        if len(data)!=info['bytes'] or digest(data)!=info['sha256']: raise ValueError('Changed source chunk')
        decoded=gzip.decompress(data)
        if len(decoded)!=info['decodedBytes']: raise ValueError('Changed source length')
        chunk=json.loads(decoded)
        if chunk['cell']!=key or len(chunk['edges'])!=info['edges']: raise ValueError('Wrong source cell')
        packed=[pack_edge(edge) for edge in chunk['edges']]
        for edge,value in zip(chunk['edges'],packed):
            if unpack_points(value[4])!=edge['points']: raise ValueError('Geometry changed')
            points+=len(edge['points']);edges+=1
        value=dumps(dict(version=2,policy=manifest['policy'],cell=key,encoding='delta-e7-v1',edges=packed))
        compressed=bytearray(gzip.compress(value,mtime=0));compressed[9]=255
        (output/(key+'.json.gz')).write_bytes(compressed)
        chunks[key]=dict(sha256=digest(compressed),bytes=len(compressed),decodedBytes=len(value),edges=len(packed))
        original+=len(data);total+=len(compressed)
    runtime=dict(version=2,policy=manifest['policy'],encoding='delta-e7-v1',source=manifest['source'],sourceManifestSha256=expected_sha,chunks=chunks)
    raw=dumps(runtime);(output/'manifest.json').write_bytes(raw)
    report=dict(manifestSha256=digest(raw),sourceManifestSha256=expected_sha,chunks=len(chunks),edgeOccurrences=edges,pointOccurrences=points,sourceBytes=original,runtimeBytes=total,geometryRoundtrip=True)
    (output/'pack-report.json').write_bytes(dumps(report))
    return report
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--source',required=True);parser.add_argument('--output',required=True)
    args=parser.parse_args();print(json.dumps(pack_network(args.source,args.output)))
