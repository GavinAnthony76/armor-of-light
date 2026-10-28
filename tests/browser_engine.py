"""Shared explicit engine selection; WebKit means Playwright, never desktop Safari."""
import os
import shutil

ENGINES = ('chromium', 'firefox', 'webkit')


def launch_engine(pw, name):
    if name not in ENGINES:
        raise ValueError('Choose ENGINE=' + '|'.join(ENGINES))
    options = {}
    if name == 'chromium':
        path = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
        if path:
            options['executable_path'] = path
        options['args'] = ['--no-sandbox']
    if name == 'firefox' and os.environ.get('FIREFOX_IN_PROCESS_MEDIA') == '1':
        options['firefox_user_prefs'] = {'media.rdd-process.enabled': False,
            'media.utility-process.enabled': False, 'media.cubeb.backend': 'null'}
    return getattr(pw, name).launch(**options)


def engine_info(browser, name):
    return dict(engine=name, version=browser.version,
                implementation='Playwright WebKit (not Safari)' if name == 'webkit' else name,
                physicalDevice=False, runnerMediaWorkaround=os.environ.get('FIREFOX_IN_PROCESS_MEDIA') == '1')


def development_base():
    """Use BASE when supplied, otherwise own and clean up one local Vite server."""
    if os.environ.get('BASE'):
        return os.environ['BASE']
    import atexit
    from pathlib import Path
    import socket
    import subprocess
    import time
    import urllib.request
    with socket.socket() as listener:
        listener.bind(('127.0.0.1', 0))
        port = listener.getsockname()[1]
    log_path = Path(__file__).resolve().parents[1] / 'generated-artifacts/vite-browser.log'
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log = open(log_path, 'w')
    child = subprocess.Popen(['node', 'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', str(port)],
                             cwd=Path(__file__).resolve().parents[1], stdout=log, stderr=log)
    def stop():
        child.terminate()
        try:
            child.wait(timeout=5)
        except subprocess.TimeoutExpired:
            child.kill()
        log.close()
    atexit.register(stop)
    base = f'http://127.0.0.1:{port}'
    for _ in range(100):
        if child.poll() is not None:
            raise RuntimeError('Vite exited; see generated-artifacts/vite-browser.log')
        try:
            urllib.request.urlopen(base, timeout=1).close()
            return base
        except OSError:
            time.sleep(.1)
    raise RuntimeError('Vite did not become ready')
