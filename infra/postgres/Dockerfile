# syntax=docker/dockerfile:1
ARG PG_MAJOR=16
FROM postgres:${PG_MAJOR}-bookworm

ARG PG_MAJOR
ARG AGE_VERSION=1.6.0
ARG PGVECTOR_VERSION=0.8.2

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    bison \
    ca-certificates \
    curl \
    flex \
    libreadline-dev \
    postgresql-server-dev-${PG_MAJOR} \
    zlib1g-dev \
  && mkdir -p /tmp/age /tmp/pgvector \
  && curl -fsSL "https://dlcdn.apache.org/age/PG${PG_MAJOR}/${AGE_VERSION}/apache-age-${AGE_VERSION}-src.tar.gz" \
    | tar -xz --strip-components=1 -C /tmp/age \
  && make -C /tmp/age PG_CONFIG="/usr/lib/postgresql/${PG_MAJOR}/bin/pg_config" install \
  && curl -fsSL "https://github.com/pgvector/pgvector/archive/refs/tags/v${PGVECTOR_VERSION}.tar.gz" \
    | tar -xz --strip-components=1 -C /tmp/pgvector \
  && make -C /tmp/pgvector PG_CONFIG="/usr/lib/postgresql/${PG_MAJOR}/bin/pg_config" OPTFLAGS="" install \
  && rm -rf /tmp/age /tmp/pgvector /var/lib/apt/lists/*

COPY initdb/ /docker-entrypoint-initdb.d/
