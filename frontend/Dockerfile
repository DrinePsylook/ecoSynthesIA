FROM node:20-alpine

WORKDIR /app

COPY package*.json yarn.lock* ./

# Installation des dépendances.
RUN yarn install --frozen-lockfile

COPY . .

# Exposition du port.
EXPOSE 5173

# Lancement en mode développement.
CMD ["yarn", "dev", "--host", "0.0.0.0"]