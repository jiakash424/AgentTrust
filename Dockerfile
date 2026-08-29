# Production Dockerfile for AgentTrust with Native Hermes Agent
FROM node:20-bookworm-slim

# Copy official uv binary from Astral
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Install Python 3.11, build tools, git, and required system libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    curl \
    git \
    openssl \
    ca-certificates \
    ripgrep \
    && rm -rf /var/lib/apt/lists/*

# Clone and install official upstream Hermes Agent pinned to verified release commit 1d8946b4
WORKDIR /opt/hermes
RUN git clone https://github.com/NousResearch/hermes-agent.git . && \
    git checkout 1d8946b4 && \
    uv sync --frozen --no-dev && \
    ln -sf /opt/hermes/.venv/bin/hermes /usr/local/bin/hermes

# Set up AgentTrust application
WORKDIR /app

# Copy package manifests and Prisma schema first for layer caching
COPY package*.json ./
COPY prisma ./prisma/

# Install Node dependencies and generate Prisma client
RUN npm install
RUN npx prisma generate

# Copy the rest of the application
COPY . .

# Pass build arguments into Vite frontend build
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

# Build Vite frontend
RUN npm run build

# Configure runtime environment
ENV NODE_ENV=production
ENV HERMES_PATH=/usr/local/bin/hermes

# Start AgentTrust Express API + Static UI Serving
CMD ["npm", "run", "start"]
