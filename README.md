[![Build Status](https://travis-ci.org/mgax/subtext.svg?branch=master)](https://travis-ci.org/mgax/subtext)

## Installation

1. Clone the repository, install dependencies, build the UI:

   ```shell
   git clone https://github.com/mgax/subtext.git
   cd subtext
   npm install
   ./run build
   ```

2. Run the server. You need to pass in two arguments: the path to a data
   folder, where subtext will create its database, and the public URL where the
   app will be accessible to peers.

   You can also set the `AUTH_TOKEN` environment variable to a password, that
   will be needed to access the UI, so that other people can't read your
   private conversations.

   ```shell
   export AUTH_TOKEN='something secret'
   ./run server /var/lib/subtext http://me.example.com
   ```

   The server will listen on port 8000; you can change this by setting the
   `PORT` environment variable.

3. Optionally set up a reverse proxy. This is what you'd write in the nginx
   config:

   ```nginx
   location / {
     proxy_pass http://localhost:8000;
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection $http_connection;
   }
   ```

   It's a good idea to secure your server with https at this point.

4. Open the public URL in your browser. If you set `AUTH_TOKEN`, the app will
   ask you for it, and save it in `localStorage`.

   Then, add a peer (like `https://mgax.grep.ro/card`), and chat away!
