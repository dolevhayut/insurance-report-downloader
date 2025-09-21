FROM apify/actor-node-puppeteer-chrome:20

# Copy source code and package files
COPY package*.json ./
COPY . ./

# Install dependencies
RUN npm install

# Set environment variables
ENV NODE_ENV=production

# Run the actor
CMD ["node", "actor.js"]
