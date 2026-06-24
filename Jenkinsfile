#!groovy
node {
    stage ('Building & Push Docker Image') {
        cleanWs()
        checkout scm
        def tag = sh(returnStdout: true, script: "git tag --contains | head -1").trim()

        docker.build("low-emedia/deepest-fantasies-v1:latest", "-f scraper/Dockerfile scraper/. --target production")
        docker.withRegistry('https://540688370389.dkr.ecr.eu-west-1.amazonaws.com', 'ecr:eu-west-1:aws-lowemedia') {
            docker.image("low-emedia/deepest-fantasies-v1").push("latest")
        }
        docker.withRegistry('https://540688370389.dkr.ecr.eu-west-1.amazonaws.com', 'ecr:eu-west-1:aws-lowemedia') {
            docker.image("low-emedia/deepest-fantasies-v1").push(tag)
        }

        sh "docker system prune -f"
        cleanWs()
    }
}
