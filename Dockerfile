FROM apify/actor-node-playwright-chrome:20-xvfb

# Copy source code and package files
COPY package*.json ./
COPY . ./

# Install dependencies only (Playwright is already installed in the base image)
RUN npm install

# Set environment variables
ENV NODE_ENV=production
ENV DISPLAY=:99

# Run the actor with xvfb for Live View support
CMD xvfb-run -a -e /dev/stdout -s "-ac -screen 0 1920x1080x24" -- node actor.js