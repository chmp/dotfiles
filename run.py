"""manage dotfiles - inspired by dotty.

Commands:

- inherit: inherit another config
- directory
- link
- copy
- render (using jinja2)
- run

"""

import argparse
import hashlib
import json
import logging
import os
import os.path
import shutil
import sys

_logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('config')

    parser.add_argument('--echo', help='show the config without executing it', action='store_true')
    parser.add_argument('--dry-run', help='only show commands, do not execute them', action='store_true')

    args = parser.parse_args()
    config = load_config(args.config)

    if args.echo:
        json.dump(config, sys.stdout, indent=2, sort_keys=True)
        raise SystemExit(0)

    run(config, dry_run=args.dry_run)

def load_config(path):
    with open(path, 'r') as fobj:
        config = json.load(fobj)

    config_dir = os.path.dirname(path)

    # normalize any paths
    config['directories'] = normalize_list(config, 'directories', config_dir)
    config['link'] = normalize_dict(config, 'link', config_dir)
    config['copy'] = normalize_dict(config, 'copy', config_dir, {'ignore_existing': False})
    config['render'] = normalize_dict(config, 'render', config_dir)
    config['commands'] = config.get('commands', [])

    # merge inherited configs
    if 'inherit' not in config:
        return config

    parent = load_config(os.path.join(config_dir, config['inherit']))
    result = parent.copy()

    for k, v in config.items():
        if not k in result:
            result[k] = v

        else:
            assert type(result[k]) is type(v)

            if type(v) is dict:
                result[k].update(v)

            elif type(v) is list:
                result[k].extend(v)

            else:
                result[k] = v

    return result


def run(config, dry_run=False):
    _logger.info('create directories')
    for d in config['directories']:
        makedirs(d, dry_run=dry_run)

    _logger.info('copy items')
    for src, dst in config['copy'].items():
        copy(src, dst['path'], dry_run=dry_run, options=dst)

    _logger.info('link items')
    for src, dst in config['link'].items():
        link(src, dst['path'], dry_run=dry_run, options=dst)

    _logger.info('render tempates')
    for src, dst in config['render'].items():
        render_template(src, dst['path'], dry_run=dry_run, options=dst)

    _logger.info('run commands')
    for cmd in config['commands']:
        run_command(cmd, dry_run=dry_run)


def makedirs(d, dry_run):
    if os.path.isdir(d):
        _logger.info('skip existing directory %s', d)
        return

    elif os.path.exists(d):
        _logger.fatal('%d is a non directory', d)

        if not dry_run:
            raise RuntimeError()

    else:
        _logger.info('create %s', d)

        if not dry_run:
            os.makedirs(d)


def copy(src, dst, dry_run, options):
    assert_path_exists(src, dry_run=dry_run)

    if os.path.exists(dst):
        if options['ignore_existing']:
            _logger.info('skip existing target %s', dst)
            return

        if path_hash(src) == path_hash(dst):
            _logger.fatal('skip existing file %s', src)
            return

        else:
            _logger.fatal('file %s exists, but is not equal to %s', dst, src)

            if not dry_run:
                raise RuntimeError()

    else:
        _logger.info('copy %s -> %s', src, dst)

        if not dry_run and os.path.isfile(src):
            shutil.copy(src, dst)

        if not dry_run and os.path.isdir(src):
            shutil.copytree(src, dst)


def path_hash(p):
    if os.path.isdir(p):
        digest = hashlib.sha1()

        for c in os.listdir(p):
            digest.update(path_hash(os.path.join(p, c)))

        return digest.digest()

    elif os.path.isfile(p):
        return file_hash(p)

    else:
        raise ValueError("unsupported path {}".format(p))


def file_hash(p):
    block_size = 10 * 1024
    digest = hashlib.sha1()

    with open(p, 'rb') as fobj:
        while True:
            block = fobj.read(block_size)

            if not block:
                break

            digest.update(block)

    return digest.digest()


def link(src, dst, dry_run, options):
    assert_path_exists(src, dry_run=dry_run)

    if os.path.islink(dst) and os.readlink(dst) == src:
        _logger.info('skip existing symlink %s -> %s', src, dst)

    elif os.path.exists(dst):
        _logger.fatal('%s exists and does not link to %s', dst, src)

        if not dry_run:
            raise RuntimeError()

    else:
        _logger.info('link %s -> %s', src, dst)

        if not dry_run:
            os.symlink(src, dst)


def render_template(src, dst, dry_run, options):
    assert_path_exists(src, dry_run=dry_run)
    raise NotImplementedError()


def run_command(cmd, dry_run):
    _logger.info('execute %s', cmd)

    if not dry_run:
        os.system(cmd)


def assert_path_exists(p, dry_run):
    if os.path.exists(p):
        return

    _logger.fatal('%s does not exists', p)

    if not dry_run:
        raise RuntimeError()


def normalize_list(config, key, config_dir):
    return [normalize_path(p, config_dir) for p in config.get(key, [])]


def normalize_dict(config, key, config_dir, defaults=None):
    return {
        normalize_path(src, config_dir): normalize_value(dst, config_dir, defaults=defaults)
        for (src, dst) in config.get(key, {}).items()
    }


def normalize_value(obj, config_dir, defaults=None):
    if defaults is None:
        defaults = {}

    if isinstance(obj, str):
        obj = {'path': obj}

    obj = {**defaults, **obj}
    obj['path'] = normalize_path(obj['path'], config_dir)

    return obj


def normalize_path(p, refpath):
    p = os.path.expandvars(p)
    p = os.path.expanduser(p)

    if not os.path.isabs(p):
        p = os.path.join(refpath, p)

    return os.path.abspath(p)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()

