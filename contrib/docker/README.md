## Usage

1. Generate an authentication token (password) for yourself, using
any kind of password generation or generation techniques.

2. Edit the provided Dockerfile and edit on the last line the <your_subtext_url>
entry with your real URL where your Subtext installation will be hosted at.

3. Build the Docker image passing the above mentioned auth token
```shell
docker build -t subtext:latest --build-arg auth_token='your_token_here' --build-arg='your_subtext_url' ./
```

4. Run the container
```shell
docker run -d -p 8000:8000 subtext:latest
```

5. Access the application in a browser, on port 8000. It will ask you for
the auth token. After you provide it, you are done, you can start using it.
