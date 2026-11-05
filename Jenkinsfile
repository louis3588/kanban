
pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timeout(time: 15, unit: 'MINUTES')
    }

    environment {
        GITHUB_REPO = 'louis3588/kanban'
    }

    stages {
        stage('Checkout Repository') {
            steps {
                checkout scm

                sh '''
                    echo "Monitoring commit:"
                    git log -1 --format="%h %s"
                '''
            }
        }

        stage('Verify GitHub CLI') {
            steps {
                sh 'gh --version'
            }
        }

        stage('Download Coverage Reports') {
            steps {
                withCredentials([
                    string(
                        credentialsId: 'github-actions-read',
                        variable: 'GH_TOKEN'
                    )
                ]) {
                    sh '''
                        set -eu
                        set +x
                        export GH_PROMPT_DISABLED=1

                        SHA=$(git rev-parse HEAD)

                        echo "Looking for CI run matching commit $SHA"

                        rm -rf reports
                        mkdir -p reports/backend reports/frontend

                        # Wait for the GitHub Actions run to appear.
                        RUN_ID=""

                        for attempt in $(seq 1 20); do
                            RUN_ID=$(gh run list \
                                --repo "$GITHUB_REPO" \
                                --workflow CI \
                                --branch main \
                                --event push \
                                --commit "$SHA" \
                                --limit 1 \
                                --json databaseId \
                                --jq '.[0].databaseId // empty')

                            if [ -n "$RUN_ID" ]; then
                                break
                            fi

                            echo "Waiting for CI run ($attempt/20)"
                            sleep 15
                        done

                        if [ -z "$RUN_ID" ]; then
                            echo "No matching CI run found."
                            exit 1
                        fi

                        echo "Found GitHub Actions run: $RUN_ID"

                        # Wait until both coverage artifacts exist.
                        READY=0

                        for attempt in $(seq 1 30); do
                            gh api \
                                "repos/$GITHUB_REPO/actions/runs/$RUN_ID/artifacts?per_page=100" \
                                --jq '.artifacts[].name' \
                                > reports/artifact-names.txt

                            if grep -Fxq "backend-coverage" reports/artifact-names.txt &&
                               grep -Fxq "frontend-coverage" reports/artifact-names.txt; then
                                READY=1
                                break
                            fi

                            STATUS=$(gh run view "$RUN_ID" \
                                --repo "$GITHUB_REPO" \
                                --json status \
                                --jq '.status')

                            if [ "$STATUS" = "completed" ]; then
                                echo "CI completed without both reports."
                                exit 1
                            fi

                            echo "Waiting for artifacts ($attempt/30)"
                            sleep 20
                        done

                        if [ "$READY" -ne 1 ]; then
                            echo "Timed out waiting for coverage reports."
                            exit 1
                        fi

                        # Download artifacts from the matching run.
                        gh run download "$RUN_ID" \
                            --repo "$GITHUB_REPO" \
                            --name backend-coverage \
                            --dir reports/backend

                        gh run download "$RUN_ID" \
                            --repo "$GITHUB_REPO" \
                            --name frontend-coverage \
                            --dir reports/frontend

                        BACKEND_XML=$(find reports/backend \
                            -type f -name coverage.cobertura.xml \
                            -print -quit)

                        FRONTEND_XML=$(find reports/frontend \
                            -type f -name cobertura-coverage.xml \
                            -print -quit)

                        mkdir -p reports/normalized

                        if [ -n "$BACKEND_XML" ]; then
                            cp "$BACKEND_XML" reports/normalized/backend.xml
                            echo "Backend coverage report found."
                        else
                            echo "Backend coverage is unavailable."
                        fi

                        if [ -n "$FRONTEND_XML" ]; then
                            cp "$FRONTEND_XML" reports/normalized/frontend.xml
                            echo "Frontend coverage report found."
                        else
                            echo "Frontend coverage is unavailable."
                        fi

                        BACKEND_TEST_XML=$(find reports/backend \
                            -type f -name junit.xml -print -quit)

                        FRONTEND_TEST_XML=$(find reports/frontend \
                            -type f -name junit.xml -print -quit)

                        echo "Downloaded backend files:"
                        find reports/backend -type f -print

                        echo "Downloaded frontend files:"
                        find reports/frontend -type f -print

                        if [ -n "$BACKEND_TEST_XML" ]; then
                            cp "$BACKEND_TEST_XML" reports/normalized/backend-tests.xml
                            echo "Backend JUnit report found."
                        else
                            echo "WARNING: Backend JUnit report is missing."
                        fi

                        if [ -n "$FRONTEND_TEST_XML" ]; then
                            cp "$FRONTEND_TEST_XML" reports/normalized/frontend-tests.xml
                            echo "Frontend JUnit report found."
                        else
                            echo "WARNING: Frontend JUnit report is missing."
                        fi

                        cp "$BACKEND_TEST_XML" reports/normalized/backend-tests.xml
                        cp "$FRONTEND_TEST_XML" reports/normalized/frontend-tests.xml

                        echo "JUnit test reports downloaded successfully."

                        echo "Both coverage reports downloaded successfully."
                    '''
                }
            }
        }

        stage('Publish Backend Coverage') {
            when {
                expression {
                    fileExists('reports/normalized/backend.xml')
                }
            }

            steps {
                recordCoverage(
                    tools: [[
                        parser: 'COBERTURA',
                        pattern: 'reports/normalized/backend.xml'
                    ]],
                    id: 'backend',
                    name: 'Backend Coverage',
                    sourceCodeRetention: 'LAST_BUILD',
                    skipPublishingChecks: true,
                    failOnError: true
                )
            }
        }

        stage('Publish Frontend Coverage') {

            when {
                expression {
                    fileExists('reports/normalized/frontend.xml')
                }
            }

            steps {
                recordCoverage(
                    tools: [[
                        parser: 'COBERTURA',
                        pattern: 'reports/normalized/frontend.xml'
                    ]],
                    id: 'frontend',
                    name: 'Frontend Coverage',
                    sourceCodeRetention: 'LAST_BUILD',
                    skipPublishingChecks: true,
                    failOnError: true
                )
            }
        }
        stage('Publish Backend Test Results') {
            when {
                expression {
                    fileExists('reports/normalized/backend-tests.xml')
                }
            }

            steps {
                junit(
                    testResults: 'reports/normalized/backend-tests.xml',
                    allowEmptyResults: false,
                    skipPublishingChecks: true
                )
            }
        }

        stage('Publish Frontend Test Results') {
            when {
                expression {
                    fileExists('reports/normalized/frontend-tests.xml')
                }
            }

            steps {
                junit(
                    testResults: 'reports/normalized/frontend-tests.xml',
                    allowEmptyResults: false,
                    skipPublishingChecks: true
                )
            }
        }
    }

    post {
        always {
            script {
                def jobName = env.JOB_NAME.replaceAll(
                    '[^A-Za-z0-9_-]', '_'
                )

                def success = currentBuild.currentResult == 'SUCCESS' ? 1 : 0
                def duration = currentBuild.duration

                env.LINE = "jenkins_job,job=${jobName} " +
                           "success=${success},duration_ms=${duration}"
            }

            withCredentials([
                usernamePassword(
                    credentialsId: 'grafana-cloud',
                    usernameVariable: 'GC_USER',
                    passwordVariable: 'GC_TOKEN'
                )
            ]) {
                sh '''
                    set +x

                    curl --fail --silent --show-error \
                        --connect-timeout 10 \
                        --max-time 30 \
                        --retry 2 \
                        --user "$GC_USER:$GC_TOKEN" \
                        --header "Content-Type: text/plain" \
                        --data-binary "$LINE" \
                        "https://prometheus-prod-55-prod-gb-south-1.grafana.net/api/v1/push/influx/write" \
                        || echo "WARNING: Grafana metrics upload failed."
                '''
            }
        }
    }

}
