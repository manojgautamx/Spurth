import os
import json
import firebase_admin
from firebase_admin import credentials

if not firebase_admin._apps:
    # serviceAccountKey.json is gitignored (contains a private key) so it isn't
    # present on hosts deployed from git — there, the key is set instead as the
    # FIREBASE_SERVICE_ACCOUNT_JSON env var containing the raw JSON contents.
    env_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT_JSON')
    if env_json:
        cred = credentials.Certificate(json.loads(env_json))
    else:
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        cred = credentials.Certificate(os.path.join(BASE_DIR, 'serviceAccountKey.json'))
    firebase_admin.initialize_app(cred)