## Usage

1. Edit the Dockerfile found in this directory and replace the ${identity} and
the ${path_to_identity} variables with your, as mentioned in point 2 of the
main README

2. Build the Docker image:
```shell
docker build -t subtext:latest ./
```

3. Run the container
```shell
docker run -d -p 8000:8000 subtext:latest
```
