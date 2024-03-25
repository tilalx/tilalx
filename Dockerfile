# Use the official Node.js 21 image as the base image
FROM node:21 as builder

# Set the working directory inside the container
WORKDIR /app

# Copy the the workspace to the container
COPY . .

# Install the project dependencies
RUN npm install

# Build the React project
RUN npm run build

# Start a new stage for the final image
FROM node:21

# Set the working directory inside the container
WORKDIR /app

# Copy the build artifacts from the builder stage to the final stage
COPY --from=builder /app/build /app/build

# Install the serve package to serve the React app
RUN npm install -g serve

# Expose the port that the React app will run on
EXPOSE 3000

# Set the command to run the React app
CMD ["serve", "-s", "build"]