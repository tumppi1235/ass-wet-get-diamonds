import gzip,hashlib,importlib.util,json,pathlib,tempfile,unittest
spec=importlib.util.spec_from_file_location('packer',pathlib.Path(__file__).with_name('Pack-RouteNetwork.py'))
packer=importlib.util.module_from_spec(spec);spec.loader.exec_module(packer)
class RuntimePackTests(unittest.TestCase):
    def temporary(self):
        target=pathlib.Path(__file__).resolve().parent.parent/'test-results'
        target.mkdir(exist_ok=True)
        return tempfile.TemporaryDirectory(dir=target)
    def fixture(self,base):
        source=base/'source';source.mkdir()
        edge=dict(id='42:0',way=42,f=3,b=1,meters=4.123,tags={'highway':'path'},points=[[10000000001,621000000,270000000],[9999999999,621000010,269999980]])
        raw=packer.dumps(dict(version=1,policy='finland-paths-dev-1',cell='1242_270',edges=[edge]));compressed=gzip.compress(raw,mtime=0)
        (source/'1242_270.json.gz').write_bytes(compressed)
        manifest=packer.dumps(dict(version=1,policy='finland-paths-dev-1',source={'md5':'fixture'},chunks={'1242_270':dict(bytes=len(compressed),sha256=packer.digest(compressed),decodedBytes=len(raw),edges=1)}))
        (source/'manifest.json').write_bytes(manifest)
        return source,packer.digest(manifest),edge
    def test_complete_runtime_keeps_source_geometry_and_mode_flags(self):
        with self.temporary() as name:
            base=pathlib.Path(name);source,sha,edge=self.fixture(base);before={p.name:p.read_bytes() for p in source.iterdir()}
            report=packer.pack_network(source,base/'runtime',sha);manifest=json.loads((base/'runtime/manifest.json').read_bytes())
            packed=json.loads(gzip.decompress((base/'runtime/1242_270.json.gz').read_bytes()))['edges'][0]
            self.assertEqual(packed[:4],[edge['id'],edge['way'],edge['f'],edge['b']]);self.assertEqual(packer.unpack_points(packed[4]),edge['points'])
            self.assertEqual(manifest['sourceManifestSha256'],sha);self.assertTrue(report['geometryRoundtrip']);self.assertEqual(report['pointOccurrences'],2)
            self.assertEqual(before,{p.name:p.read_bytes() for p in source.iterdir()})
            with self.assertRaises(FileExistsError):packer.pack_network(source,base/'runtime',sha)
    def test_changed_hash_and_aliasing_output_are_rejected(self):
        with self.temporary() as name:
            base=pathlib.Path(name);source,sha,_=self.fixture(base)
            with self.assertRaises(ValueError):packer.pack_network(source,base/'wrong','0'*64)
            self.assertFalse((base/'wrong').exists())
            with self.assertRaises(ValueError):packer.pack_network(source,source/'runtime',sha)
            (source/'1242_270.json.gz').write_bytes(b'corrupt')
            with self.assertRaises(ValueError):packer.pack_network(source,base/'bad',sha)
            self.assertFalse((base/'bad/manifest.json').exists(),'partial output is not a complete runtime')
if __name__=='__main__':unittest.main()
