pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
    }

    stages {
        stage('Checkout Repository') {
            steps {
                checkout scm
            }
        }

        stage('Verify Checkout') {
            steps {
                echo 'Kanban repository successfully checked out!'

                sh 'git log -1 --format="%h %s"'
            }
        }
    }
}
