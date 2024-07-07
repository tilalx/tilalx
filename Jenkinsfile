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
                ]], branches: [[name: '**']]]
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

                    sh """
                        docker buildx build --platform linux/amd64,linux/arm64 --build-arg DOCKER_BUILDKIT=${env.DOCKER_BUILDKIT} -t ${env.IMAGE_NAME}:${tagName} --push .
                    """
                }
            }
        }

        stage('Cleanup') {
            steps {
                script {
                    def builderName = "builder-${env.BUILD_ID}-${env.BRANCH_NAME}"
                    sh "docker buildx rm ${builderName}"
                }
            }
        }
    }

    post {
        always {
            cleanWs() // Clean workspace after each build
        }
    }
}
