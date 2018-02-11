docker build -f [dockerfile] -t node-docker .
docker run --rm -it -p 3000:3000 node-docker