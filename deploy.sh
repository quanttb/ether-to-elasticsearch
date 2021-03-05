#!/bin/bash

# Exit on first error
set -euo pipefail

docker-compose down
docker rmi node-script || true
docker-compose up -d elasticsearch-kibana
docker logs -f elasticsearch-kibana