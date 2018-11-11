import argparse
import os.path
import subprocess
import threading
import time
import webbrowser

from flask import Flask, render_template, jsonify, request

basedir = os.path.abspath(os.path.dirname(__file__))


def build_app(root):
    print('build app for', root)
    root = os.path.abspath(root)

    if not root.endswith(os.path.sep):
        root = root + os.path.sep

    app = Flask(
        __name__,
        static_folder=os.path.join(basedir, 'static'),
    )

    @app.route('/')
    def index():
        with open(os.path.join(basedir, 'static', 'index.html'), 'rt') as fobj:
            return fobj.read()

    @app.route('/tree/<path:path>')
    @app.route('/tree')
    @app.route('/tree/')
    def tree_get(path='.'):
        local_path = os.path.abspath(os.path.join(root, path))
        assert local_path.startswith(root) or local_path == os.path.abspath(root)

        if os.path.isdir(local_path):
            return jsonify(
                type='dir',
                content=[
                    path + '/' + p
                    for p in os.listdir(local_path)
                    if (
                        not p.startswith('.') and (
                            p.endswith('.md') or
                            p.endswith('.ipynb') or
                            os.path.isdir(os.path.join(root, path, p))
                        )
                    )
                ],
            )

        with open(local_path, 'rt') as fobj:
            content = fobj.read()

        return jsonify(
            type='file',
            content=content,
        )

    @app.route('/tree/<path:path>', methods=['POST'])
    def tree_post(path):
        raise RuntimeError('updates currently not supported')

    @app.route('/open/')
    @app.route('/open/<path:path>')
    def _open(path='.'):
        subprocess.check_call(['open', path], cwd=root)
        return jsonify(type='success')

    @app.route('/new/<path:path>')
    def _new(path):
        subprocess.check_call(['touch', path], cwd=root)
        subprocess.check_call(['open', path], cwd=root)
        return jsonify(type='success')

    return app


def wait_and_open_tab(root, url, delay=1):
    def target():
        time.sleep(delay)
        webbrowser.open_new_tab(url)

    threading.Thread(target=target).start()


def main(args=None):
    parser = argparse.ArgumentParser()
    parser.add_argument('root', nargs='?', default='.')
    parser.add_argument('--debug', default=False, action='store_true')

    args = parser.parse_args(args)
    app = build_app(args.root)

    wait_and_open_tab(args.root, 'http://localhost:5000/#/home', delay=1)
    app.run(debug=args.debug)
