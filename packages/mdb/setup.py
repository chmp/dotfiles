from setuptools import setup, PEP420PackageFinder


setup(
    name='mdb',
    version='18.11.0',
    package_dir={'': 'src'},
    package_data={'': ['*.css', '*.js', '*.html']},
    packages=PEP420PackageFinder.find("src"),
    install_requires=['flask'],
)
