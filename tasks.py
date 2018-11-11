from invoke import task


@task
def build(c):
    print(":: building mdb")
    c.run("pex packages/mdb -e mdb.app:main -o tools/mdb")
    print(":: done")
    print(":: all done")