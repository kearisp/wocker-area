#!/bin/bash

dbus-send \
    --session \
    --dest=org.freedesktop.secrets \
    --type=method_call \
    --print-reply \
    /org/freedesktop/secrets \
    org.freedesktop.DBus.Properties.Get \
    string:"org.freedesktop.Secret.Service" \
    string:"Collections"
