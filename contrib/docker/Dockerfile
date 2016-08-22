FROM ubuntu:14.04
ARG auth_token

# The app listens on this port
EXPOSE 8000

# Prepare the base system
RUN apt-get update
RUN apt-get -y remove vim-tiny
RUN apt-get -y install curl git vim

# Install Node.js 5.x
RUN curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
RUN apt-get -y install nodejs

# Clone the git repo, install the npm modules
VOLUME /var/lib/subtext
RUN cd /opt && git clone https://github.com/mgax/subtext.git
WORKDIR /opt/subtext
RUN npm install
RUN ./run build

# Start subtext
ENV AUTH_TOKEN ${auth_token}
ENTRYPOINT ["./run", "server", "/var/lib/subtext", "<your_subtext_url>"]
