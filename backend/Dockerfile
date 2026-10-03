FROM node:20-alpine

WORKDIR /app

# The build context is now the repo root, so we specify backend/
COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ .

# Copy frontend to /frontend (sibling of /app)
COPY frontend/ /frontend/

EXPOSE 3000

CMD ["npm", "start"]
