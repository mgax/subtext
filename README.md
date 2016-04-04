## Installation

You will need a recent version of node.js (5.x).


1. Clone the repository, install dependencies

   ```shell
   git clone https://github.com/mgax/subtext.git
   cd subtext
   npm install
   ```

2. Create an identity. This will generate a keypair for communication with
   peers and an authentication token to log into your account from a web
   browser.

   You will be asked about the URL of the server. That URL will be used for two
   things: for you to access your account, and for an API where peers will send
   messages.

   ```shell
   ./run createidentity ../foo
   ```

3. Start the server

   ```shell
   ./run devserver ../foo
   ```

4. Optionally set up a reverse proxy. This is what you'd write in the nginx
   config:

   ```nginx
   location / {
     proxy_pass http://localhost:8000;
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection $http_connection;
   }
   ```

   It's a good idea to secure your server with https at this point.

5. Open the public URL in your browser. Open a javascript console and set this
   variable, replacing the authentication token generated in step 2, then
   refresh the page.

   ```javascript
   localStorage.subtext_authToken = 'MY_AUTH_TOKEN'
   ```
