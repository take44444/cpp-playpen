#!/bin/sh

docker build \
    --no-cache \
    --force-rm \
    --pull \
    --rm \
    --tag cpp-sandbox \
    --file docker/Dockerfile \
    docker

docker build \
    --no-cache \
    --force-rm \
    --pull \
    --rm \
    --tag cpp-playpen \
    .
