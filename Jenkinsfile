pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub')
        IMAGE_NAME = "tilalx/tilalx"
        DOCKER_BUILDKIT = 1
        PIPELINE_NAME = "${JOB_NAME.replaceAll('/', '_')}-${BUILD_NUMBER}"
        DOCKER_CLI_EXPERIMENTAL = 'enabled'
    }

    triggers {
        githubPush() // GitHub hook trigger for GITScm polling
    }

    options {
        timestamps() // Enable timestamps for each build step
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm: [$class: 'GitSCM', userRemoteConfigs: [[
                    url: 'https://github.com/tilalx/tilalx.git',
                    credentialsId: 'github-tilalx'
                ]], branches: [[name: 'main']]]
            }
        }

        stage('Setup Buildx') {
            steps {
                script {
                    sh 'docker run --rm --privileged tonistiigi/binfmt --install all'
                    def builderName = "builder-${env.BUILD_ID}-${env.BRANCH_NAME}"
                    sh "docker buildx create --name ${builderName} --use"
                    sh 'docker buildx inspect --bootstrap'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    def branchName = env.BRANCH_NAME
                    def tagName = ""

                    if (branchName == "main") {
                        tagName = "latest"
                    } else if (branchName.startsWith("PR-")) {
                        tagName = "pr-${branchName.split('-')[1]}"
                    } else {
                        tagName = branchName
                    }

                    // Build and push the Docker image.
                    sh """
                        docker buildx build --platform linux/amd64,linux/arm64 --build-arg DOCKER_BUILDKIT=${env.DOCKER_BUILDKIT} \
                          -t ${env.IMAGE_NAME}:${tagName} --push .
                    """
                }
            }
        }

        stage('Commit Deploy Branch') {
            steps {
                script {
                    // Recalculate the tagName based on the branch name.
                    def branchName = env.BRANCH_NAME
                    def tagName = ""
                    if (branchName == "main") {
                        tagName = "latest"
                    } else if (branchName.startsWith("PR-")) {
                        tagName = "pr-${branchName.split('-')[1]}"
                    } else {
                        tagName = branchName
                    }

                    // Create a temporary container from the built image.
                    sh "docker create --name extract-container ${env.IMAGE_NAME}:${tagName}"

                    // Create a folder to hold the build artifacts.
                    sh "mkdir -p build-artifacts"

                    // Copy the build output (from Nginx's directory) out of the container.
                    sh "docker cp extract-container:/usr/share/nginx/html ./build-artifacts"

                    // Remove the temporary container.
                    sh "docker rm extract-container"

                    // Commit the extracted build artifacts into the deploy branch.
                    withCredentials([usernamePassword(credentialsId: 'github-tilalx', 
                                                      usernameVariable: 'GIT_USERNAME', 
                                                      passwordVariable: 'GIT_PASSWORD')]) {
                        // Configure Git.
                        sh "git config user.email '${GIT_USERNAME}@users.noreply.github.com'"
                        sh "git config user.name '${GIT_USERNAME}'"

                        // Checkout the deploy branch.
                        sh "git checkout -B deploy"

                        // Remove all existing tracked files.
                        sh "git rm -rf . || true"

                        // Move build artifacts under `docs/` directory
                        sh "mkdir -p docs"
                        sh "mv build-artifacts/html/* docs/"

                        // Stage and commit the changes.
                        sh "git add ."
                        sh "git commit -m 'Deploy: updated React build artifacts from Docker image under docs/' || echo 'No changes to commit'"

                        // Update the remote URL to include credentials and push.
                        sh "git remote set-url origin https://${GIT_USERNAME}:${GIT_PASSWORD}@github.com/tilalx/tilalx.git"
                        sh "git push --force origin deploy"
                    }
                }
            }
        }

    }

    post {
        always {
            script {
                def builderName = "builder-${env.BUILD_ID}-${env.BRANCH_NAME}"
                sh "docker buildx rm ${builderName}"
            }
            cleanWs() // Clean workspace after each build
        }
    }
}
