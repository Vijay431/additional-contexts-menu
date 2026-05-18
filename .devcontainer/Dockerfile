FROM mcr.microsoft.com/devcontainers/typescript-node:22

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    dbus-x11 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxkbcommon0 \
    libxrandr2 \
    xvfb \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable
