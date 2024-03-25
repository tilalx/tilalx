# Use the official Node.js 21 image as the base image
FROM node:21

# Set the working directory inside the container
WORKDIR /app

# Copy the the workspace to the container
COPY . .

# Install the project dependencies
RUN npm install


# Build the React project
RUN npm run build

# Expose the port that the React app will run on
EXPOSE 3000

# Set the command to run the React app
CMD ["yarn", "start"]