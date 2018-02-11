FROM node:carbon

RUN apt-get update -qq && apt-get install -y build-essential libpq-dev libkrb5-dev mongodb

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

# Bundle app source
COPY . /app


RUN npm install
# If you are building your code for production
# RUN npm install --only=production

EXPOSE 3000
CMD [ "node", "index.js" ]