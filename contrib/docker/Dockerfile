FROM ubuntu:14.04

# The app listens on this port
EXPOSE 8000

# Prepare the base system
RUN apt-get update
RUN apt-get -y remove vim-tiny
RUN apt-get -y install curl git vim

# Install Node.js 5.x
RUN curl -sL https://deb.nodesource.com/setup_5.x | sudo -E bash -
RUN apt-get -y install nodejs

# Add our identity
ADD ${identity} ${path_to_identity}

# Clone the git repo, install the npm modules
RUN cd /opt && git clone https://github.com/mgax/subtext.git
WORKDIR /opt/subtext
RUN npm install

# Start subtext
ENTRYPOINT ["./run", "server", "${path_to_identity}"]
