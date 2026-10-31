FROM mcr.microsoft.com/playwright:v1.55.0-noble

WORKDIR /opt/pw
COPY package.json package-lock.json ./
RUN npm ci

WORKDIR /test
COPY package.json package-lock.json playwright.config.js ./
COPY helpers ./helpers
COPY *.spec.js ./
ENV NODE_PATH=/opt/pw/node_modules
ENV PATH=/opt/pw/node_modules/.bin:$PATH

CMD ["playwright", "test"]
