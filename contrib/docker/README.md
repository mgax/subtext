## Usage

1. Generate an authentication token (password) for yourself, using
any kind of password generation or generation techniques.

2. Build the Docker image passing the above mentioned auth token to
the build command:
```shell
docker build -t subtext:latest --build-arg auth_token='your_token_here' ./
```

3. Run the container
```shell
docker run -d -p 8000:8000 subtext:latest
```

4. Access the application in a browser, on port 8000. It will ask you for
the auth token. After you provide it, you are done, you can start using it.
