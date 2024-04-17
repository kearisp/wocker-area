FROM ubuntu:latest

ARG USER=user
ARG UID=1000
ARG GID=1000

ENV SUBDOMAIN=""
ENV CONTAINER="default"

RUN apt-get update && apt-get install -y autossh
RUN useradd -u $UID -m -d /home/$USER -s /bin/bash $USER && \
    adduser $USER sudo && \
    echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers && \
    chown -R $USER:$USER /home/$USER

USER $USER
