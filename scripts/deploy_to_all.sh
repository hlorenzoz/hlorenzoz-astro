#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Ensure common binary paths are included
export PATH=$PATH:/usr/local/bin:/opt/homebrew/bin

echo "🚀 Starting multi-branch deployment pipeline for hlorenzoz.com..."

# 1. Deployment from devel (Preview)
echo ""
echo "📦 [1/3] Deploying DEVEL branch..."
git checkout devel
bun run build:pages
bun x wrangler pages deploy dist --project-name=hlorenzoz --branch devel

# 2. Deployment from staging (Preview)
echo ""
echo "📦 [2/3] Deploying STAGING branch..."
git checkout staging
bun run build:pages
bun x wrangler pages deploy dist --project-name=hlorenzoz --branch staging

# 3. Deployment from main (Production)
echo ""
echo "📦 [3/3] Deploying MAIN branch..."
git checkout main
bun run build:pages
bun x wrangler pages deploy dist --project-name=hlorenzoz --branch main

# 4. Finalizing
echo ""
echo "🔙 Returning to DEVEL branch for development..."
git checkout devel

echo ""
echo "✅ SUCCESS: All branches built and deployed to Cloudflare Workers."
