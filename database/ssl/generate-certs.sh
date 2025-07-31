#!/bin/bash
# Generate SSL certificates for PostgreSQL

set -e

CERT_DIR="$(dirname "$0")"
cd "$CERT_DIR"

# Generate CA private key
openssl genrsa -aes256 -passout pass:changeme -out ca.key 4096

# Generate CA certificate
openssl req -new -x509 -key ca.key -days 365 -out ca.crt -passin pass:changeme \
  -subj "/C=US/ST=State/L=City/O=DaydreamPortal/CN=DaydreamCA"

# Generate server private key
openssl genrsa -out server.key 4096

# Generate server certificate signing request
openssl req -new -key server.key -out server.csr \
  -subj "/C=US/ST=State/L=City/O=DaydreamPortal/CN=localhost"

# Generate server certificate
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out server.crt -days 365 -passin pass:changeme

# Set proper permissions
chmod 600 server.key ca.key
chmod 644 server.crt ca.crt

# Clean up
rm server.csr ca.srl

echo "SSL certificates generated successfully"
echo "Note: Change the CA key password from 'changeme' in production"
