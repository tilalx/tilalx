pipeline {
  agent any

  environment {
    DOCKERHUB_CREDENTIALS   = credentials('dockerhub')
    IMAGE_NAME              = "tilalx/tilalx"
    DOCKER_BUILDKIT         = "1"
    DOCKER_CLI_EXPERIMENTAL = "enabled"
  }

  triggers {
    githubPush()
  }

  options {
    timestamps()
  }

  stages {

    stage('Checkout Code') {
      steps {
        checkout scm
      }
    }

    stage('Setup Buildx') {
      steps {
        script {
          sh 'docker run --rm --privileged tonistiigi/binfmt --install all'

          env.BUILDER_NAME = "builder-${env.JOB_NAME.replaceAll('[^A-Za-z0-9_.-]', '-')}-${env.BUILD_NUMBER}"

          sh "docker buildx rm ${env.BUILDER_NAME} || true"
          sh "docker buildx create --name ${env.BUILDER_NAME} --use"
          sh "docker buildx inspect --bootstrap"
        }
      }
    }

    stage('Build Docker Image') {
      steps {
        script {
          def isPR = env.CHANGE_ID?.trim()
          def branchName = env.BRANCH_NAME ?: (isPR ? env.CHANGE_BRANCH : "unknown")

          def tagName
          if (branchName == "main") {
            tagName = "latest"
          } else if (isPR) {
            tagName = "pr-${env.CHANGE_ID}"
          } else {
            tagName = branchName.replaceAll('[^0-9A-Za-z_.-]', '-')
          }

          env.IMAGE_TAG = "${env.IMAGE_NAME}:${tagName}"

          if (branchName == "main") {
            withCredentials([usernamePassword(
              credentialsId: 'dockerhub',
              usernameVariable: 'DOCKERHUB_USER',
              passwordVariable: 'DOCKERHUB_PASS'
            )]) {
              sh 'echo "$DOCKERHUB_PASS" | docker login -u "$DOCKERHUB_USER" --password-stdin'
              sh """
                docker buildx build --platform linux/amd64 \
                  -t ${env.IMAGE_TAG} --push .
              """
            }
          } else {
            sh """
              docker buildx build --platform linux/amd64 \
                -t ${env.IMAGE_TAG} --load .
            """
          }
        }
      }
    }
  }

  post {
    always {
      script {
        if (env.BUILDER_NAME?.trim()) {
          sh "docker buildx rm ${env.BUILDER_NAME} || true"
        }
      }
      cleanWs()
    }
  }
}
