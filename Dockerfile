# Use the official Node.js 21 image as the base image
FROM node:21

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json and yarn.lock files to the working directory
COPY package.json package-lock.json ./


# Install the project dependencies
RUN npm install

# Copy the rest of the project files to the working directory
COPY . .

# Build the React project
RUN npm run build

# Expose the port that the React app will run on
EXPOSE 3000

# Set the command to run the React app
CMD ["yarn", "start"]