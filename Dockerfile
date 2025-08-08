# Use the official Node.js 23 image as the base image for the build stage
FROM node:24 AS builder

# Set the working directory inside the container
WORKDIR /app

# Set the Yarn version to Berry
RUN yarn set version berry

RUN corepack enable

# Copy the entire project directory into the container
COPY . .

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