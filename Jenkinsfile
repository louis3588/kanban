
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

                        # Locate the actual XML files.
                        BACKEND_XML=$(find reports/backend \
                            -type f -name coverage.cobertura.xml \
                            -print -quit)

                        FRONTEND_XML=$(find reports/frontend \
                            -type f -name cobertura-coverage.xml \
                            -print -quit)

                        if [ -z "$BACKEND_XML" ] || [ -z "$FRONTEND_XML" ]; then
                            echo "Missing coverage XML."
                            exit 1
                        fi

                        # Normalise paths for the Jenkins Coverage plugin.
                        mkdir -p reports/normalized

                        cp "$BACKEND_XML" reports/normalized/backend.xml
                        cp "$FRONTEND_XML" reports/normalized/frontend.xml

                        echo "Both coverage reports downloaded successfully."
                    '''
                }
            }
        }

        stage('Publish Backend Coverage') {
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
    }
}
