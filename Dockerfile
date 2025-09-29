FROM apify/actor-node-playwright-chrome:20

# Copy source code and package files
COPY package*.json ./
COPY . ./

# Install dependencies and Playwright browsers
RUN npm install && \
    npx playwright install chromium && \
    npx playwright install-deps chromium

# Set environment variables
ENV NODE_ENV=production

# Run the actor
CMD ["node", "actor.js"]