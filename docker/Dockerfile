FROM ubuntu:20.04

RUN apt-get update
RUN apt-get install -y --no-install-recommends \
      build-essential curl file ca-certificates
COPY bin/evaluate.sh /usr/local/bin/
USER nobody

WORKDIR /tmp
