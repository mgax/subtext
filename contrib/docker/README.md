## Usage

1. Generate an auth token for yourself, using apg or the like.

2. Build the Docker image by passing the docker build command the
auth token you have generated above, the public URL where this Subtext
will live at and the directory where Subtext will store its data
```shell
docker build -t subtext:latest --build-arg auth_token='your_auth_token' --build-arg public_url='http://subtext.example.com' --build-arg var_dir='/var/lib/subtext' ./
```

3. Run the container. We recomend mounting the dir from the 'var_dir'
env variable above, to a directory on the host filesystem:
```shell
docker run -d -p 8000:8000 -v /var/lib/subtext:/var/lib/subtext subtext:latest
```
