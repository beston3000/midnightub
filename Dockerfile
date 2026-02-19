FROM node:22-alpine

ENV NODE_ENV=production
ARG NPM_BUILD="npm install --omit=dev"

LABEL maintainer="Mercury Workshop"
LABEL summary="Scramjet Demo Image"
LABEL description="Example application of Scramjet"

WORKDIR /app

# Install necessary system dependencies including yt-dlp and ffmpeg
RUN apk add --upgrade --no-cache python3 make g++ yt-dlp ffmpeg

# Copy ONLY package.json to force fresh dependency resolution
COPY ["package.json", "./"]
RUN $NPM_BUILD

# Copy the rest of your app code
COPY . .

# Tell Docker this app uses port 8080
EXPOSE 8080/tcp

# Start the application using npm
CMD ["npm", "start"]
