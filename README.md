# C++ Playpen

A web interface for running C++ code.

## System Requirements

Currently needs to be run on a system with access to Docker.

## Running the web server

First, create the Docker images that playpen will use:

```bash
$ sh build.sh
```

Next, spin up the server.

```bash
$ docker run -d -v /var/run/docker.sock:/var/run/docker.sock -p 8080:8080 cpp-playpen
```

You should now be able to browse http://127.0.0.1:8080 and interact.

If the code runner doesn't work, please check if the "docker" group in the host and one in the container have same group IDs.

## Note
This web app can't execute users' code in parallel.

Consider using a newer web app framework such as [axum](https://github.com/tokio-rs/axum)!

## Caution
The container gets access to docker.sock, so it has more privileges over the docker daemon.

Consider using [Sysbox](https://github.com/nestybox/sysbox) for security!