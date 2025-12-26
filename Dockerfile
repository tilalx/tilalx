# Use the official Node.js 25 image as the base image for the build stage
FROM node:25 AS builder

# Set the working directory inside the container
WORKDIR /app

# Ensure Corepack is available even if the image ships with legacy Yarn binaries
RUN rm -f /usr/local/bin/yarn /usr/local/bin/yarnpkg \
  && npm install -g corepack \
  && corepack enable

# Copy the entire project directory into the container
COPY public ./public
COPY src ./src
COPY package.json ./
COPY yarn.lock ./
COPY .yarnrc.yml ./
COPY vite.config.js ./
COPY index.html ./

# Install the project dependencies
RUN yarn install

# Build the application
RUN yarn build

# Use the official Nginx image as the base image for the runtime stage
FROM nginx:1.29

# Copy the build output from the builder stage to the Nginx HTML directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80 for the Nginx server
EXPOSE 80

# Start Nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
