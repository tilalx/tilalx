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
        // For Multibranch / PR builds, Jenkins already checks out the right ref in `scm`.
        checkout scm
      }
    }

    stage('Setup Buildx') {
      steps {
        script {
          sh 'docker run --rm --privileged tonistiigi/binfmt --install all'

          // Make builder name stable+unique for this run (safe for PRs and concurrency)
          env.BUILDER_NAME = "builder-${env.JOB_NAME.replaceAll('/', '-')}-${env.BUILD_NUMBER}"

          // Ensure any previous builder with same name is removed (best-effort)
          sh "docker buildx rm ${env.BUILDER_NAME} || true"
          sh "docker buildx create --name ${env.BUILDER_NAME} --use"
          sh "docker buildx inspect --bootstrap"
        }
      }
    }

    stage('Build Docker Image') {
      steps {
        script {
          // Jenkins PR builds often have CHANGE_ID / CHANGE_BRANCH
          def isPR = env.CHANGE_ID?.trim()
          def branchName = env.BRANCH_NAME ?: (isPR ? env.CHANGE_BRANCH : "unknown")

          def tagName
          if (branchName == "main") {
            tagName = "latest"
          } else if (isPR) {
            tagName = "pr-${env.CHANGE_ID}"
          } else {
            // sanitize for docker tags
            tagName = branchName.replaceAll('[^0-9A-Za-z_.-]', '-')
          }

          env.IMAGE_TAG = "${env.IMAGE_NAME}:${tagName}"

          // For PRs: build (and optionally load) without pushing.
          // For main: build + push.
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
            // PR/branch build: no push
            sh """
              docker buildx build --platform linux/amd64 \
                -t ${env.IMAGE_TAG} --load .
            """
          }
        }
      }
    }

    stage('Commit Deploy Branch') {
      when {
        branch 'main'
      }
      steps {
        script {
          // Create a temporary container from the image built on main (latest)
          sh "docker create --name extract-container ${env.IMAGE_TAG}"

          sh "rm -rf build-artifacts || true"
          sh "mkdir -p build-artifacts"

          // Copy build output out of the container
          sh "docker cp extract-container:/usr/share/nginx/html ./build-artifacts"

          sh "docker rm -f extract-container || true"

          withCredentials([usernamePassword(
            credentialsId: 'github-tilalx',
            usernameVariable: 'GIT_USERNAME',
            passwordVariable: 'GIT_PASSWORD'
          )]) {
            sh "git config user.email '${GIT_USERNAME}@users.noreply.github.com'"
            sh "git config user.name '${GIT_USERNAME}'"

            // Ensure we have deploy locally
            sh "git fetch origin deploy || true"
            sh "git checkout -B deploy"

            // Clean tracked files
            sh "git rm -rf . || true"

            // Put build output into docs/
            sh "mkdir -p docs"
            sh "cp -R build-artifacts/html/. docs/"

            sh "git add -A"
            sh "git commit -m 'Deploy: update build artifacts' || echo 'No changes to commit'"

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
        if (env.BUILDER_NAME?.trim()) {
          sh "docker buildx rm ${env.BUILDER_NAME} || true"
        }
      }
      cleanWs()
    }
  }
}
