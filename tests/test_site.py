import json
import unittest
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1] / 'root'

class SiteTests(unittest.TestCase):
    def test_manifest_and_readers(self):
        docs = json.loads((ROOT / 'assets/documents.json').read_text(encoding='utf-8'))
        self.assertGreater(len(docs), 0)
        self.assertEqual(len(docs), len({d['id'] for d in docs}))
        readers = [p.read_text(encoding='utf-8') for p in ROOT.glob('*/*.html')]
        for doc in docs:
            self.assertTrue((ROOT / unquote(doc['path'].lstrip('/'))).is_file())
            self.assertEqual(sum(f'data-document-id="{doc["id"]}"' in page for page in readers), 1)
        self.assertTrue(any(d['kind'] == 'PDF' for d in docs))
        self.assertTrue(any(d['kind'] == 'Markdown' for d in docs))

    def test_no_secrets_in_public_config(self):
        for path in ROOT.rglob('*.html'):
            text = path.read_text(encoding='utf-8')
            self.assertNotIn('GEMINI_API_KEY', text)
            self.assertNotIn('TURNSTILE_SECRET_KEY', text)

if __name__ == '__main__':
    unittest.main()
