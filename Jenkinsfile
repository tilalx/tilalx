pipeline {
    agent any

    parameters {
        string(name: 'VERSION', defaultValue: '99.99.99', description: 'Version tag for the Docker image')
    }

    environment {
        IMAGE_NAME = "tilalx/tilalx"
        DOCKER_BUILDKIT = 1
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm: [$class: 'GitSCM', userRemoteConfigs: [[
                    url: 'https://github.com/tilalx/tilalx.git',
                    credentialsId: 'github-tilalx'
                ]], branches: [[name: '*/main']]]
            }
        }
        
        stage('Create and Bootstrap Docker Builder') {
            steps {
                script {
                    // Create and start the builder
                    //sh "docker buildx create --name multiarchbuild --use"
                    sh "docker buildx inspect multiarchbuild --bootstrap"
                }
            }
        }

        stage('Build Docker Image for amd64') {
            steps {
                script {
                    def imageTag = "${env.IMAGE_NAME}:${params.VERSION}"

                    // Build the image for amd64 and load into Docker
                    sh "docker buildx build --platform linux/amd64 -t ${imageTag} ."
                }
            }
        }

        stage('Build Docker Image for ARM Platforms') {
            steps {
                script {
                    def imageTag = "${env.IMAGE_NAME}:${params.VERSION}"

                    // Build the image for ARM platforms and load into Docker
                    sh "docker buildx build --platform linux/arm/v7,linux/arm64/v8 -t ${imageTag} ."
                }
            }
        }
    }
}
