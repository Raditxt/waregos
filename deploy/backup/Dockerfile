# Image job backup database Waregos (ADR 0007).
# Base = tag Postgres yang sama dengan service `db`. Sumbernya file deploy/postgres-tag;
# workflow `images` meneruskannya sebagai build-arg. Build lokal dari root repo:
#   docker build -f deploy/backup/Dockerfile --build-arg POSTGRES_TAG=$(cat deploy/postgres-tag) \
#     -t ghcr.io/raditxt/waregos-backup:local deploy/backup
ARG POSTGRES_TAG
FROM postgres:${POSTGRES_TAG}

# age: enkripsi ke kunci publik. rclone: unggah ke R2. curl: ping healthchecks.io.
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends age rclone curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --chmod=0755 backup.sh /usr/local/bin/waregos-backup

# Tidak pernah jalan sebagai root. Plaintext dump hanya di tmpfs /work (lihat compose.yaml).
USER postgres
WORKDIR /work
ENTRYPOINT ["/usr/local/bin/waregos-backup"]
