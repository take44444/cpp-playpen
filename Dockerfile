FROM ubuntu:20.04

# Configure time zone
ENV TZ=Asia/Tokyo
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN apt-get update
RUN apt-get install -y --no-install-recommends \
      libssl-dev pkg-config build-essential \
      curl file ca-certificates

# Install docker
# RUN apt-get install -y --no-install-recommends gnupg lsb-release
# RUN mkdir -p /etc/apt/keyrings
# RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
# RUN echo \
#       "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
#       $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
# RUN apt-get update
# RUN apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
RUN curl -sSL https://get.docker.com | sh
RUN usermod -aG docker nobody

# make working directory
RUN mkdir /work
RUN chmod 777 /work
RUN chmod +t /work
WORKDIR /work

# Install rust
ENV RUST_HOME /usr/local/lib/rust
ENV RUSTUP_HOME ${RUST_HOME}/rustup
ENV CARGO_HOME ${RUST_HOME}/cargo
RUN mkdir /usr/local/lib/rust && \
    chmod 0755 $RUST_HOME
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs > ${RUST_HOME}/rustup.sh \
    && chmod +x ${RUST_HOME}/rustup.sh \
    && ${RUST_HOME}/rustup.sh -y --default-toolchain "1.65.0" --no-modify-path
ENV PATH $PATH:$CARGO_HOME/bin

# Build app
COPY src/ /work/src/
COPY Cargo.toml /work/
RUN cargo build --release --bin playpen

COPY static/ /work/static/

USER nobody

# Run app
ENTRYPOINT /work/target/release/playpen 0.0.0.0 > /dev/null 2>&1