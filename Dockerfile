FROM apify/actor-node-playwright-chrome:20

# Copy source code and package files
COPY package*.json ./
COPY . ./

# Install dependencies only (Playwright is already installed in the base image)
RUN npm install

# Set environment variables
ENV NODE_ENV=production

# Run the actor
CMD ["node", "actor.js"]