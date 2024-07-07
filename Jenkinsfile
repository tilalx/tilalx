pipeline {
    agent any

    parameters {
        string(name: 'VERSION', defaultValue: '99.99.99', description: 'Version tag for the Docker image')
    }

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub')
        IMAGE_NAME = "tilalx/tilalx"
        DOCKER_BUILDKIT = 1
        PIPELINE_NAME = "${JOB_NAME}-${BUILD_NUMBER}"
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
                ]], branches: [[name: '*/main']]]
            }
        }

        stage('Create and Bootstrap Docker Builder') {
            steps {
                script {
                    createAndBootstrapDockerBuilder()
                }
            }
        }

        stage('Build Docker Images for Each Architecture') {
            parallel {
                stage('Build Docker Image for AMD64') {
                    steps {
                        buildDockerImage('amd64')
                    }
                }
                stage('Build Docker Image for ARM Platforms') {
                    steps {
                        buildDockerImage('arm')
                    }
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo 'Build and Push Successful!'
        }
        failure {
            echo 'Build or Push Failed.'
        }
    }
}

def createAndBootstrapDockerBuilder() {
    script {
        def builderName = "multiarchbuild-${env.PIPELINE_NAME}"
        sh """
            docker buildx create --name ${builderName} --use
            docker buildx inspect ${builderName} --bootstrap
        """
    }
}

def buildDockerImage(arch) {
    script {
        def imageTag = "${env.IMAGE_NAME}:${params.VERSION}"
        if (env.CHANGE_ID) {
            imageTag = "${env.IMAGE_NAME}:pr-${env.CHANGE_ID}-${arch}"
        }

        def platform = (arch == 'amd64') ? 'linux/amd64' : 'linux/arm/v7,linux/arm64/v8'
        def builderName = "builder-${arch}-${env.PIPELINE_NAME}"
        
        docker.withRegistry('https://index.docker.io/v1/', 'dockerhub') {
            sh """
                export DOCKER_CLI_EXPERIMENTAL=enabled
                docker buildx create --use --name ${builderName}
                docker buildx build --platform ${platform} -t ${imageTag} . \
                    --progress=plain \
                    --push
                docker buildx rm ${builderName}
            """
        }
    }
}
