#!/bin/bash

# websocketd calls me!

WSAUTHPWD=REPLACE_WITH_KEY_BETWEEN_SERVER_AND_GATEWAY

echo "#\$#ws remoteip: $HTTP_X_REAL_IP auth: $WSAUTHPWD"

#TODO: a plack gateway between websocketd and MOO

nc -C REPLACE_WITH_MOO_SERVER_IP_ADDRESS_OR_HOSTNAME REPLACE_WITH_MOO_SERVER_PORT_NUMBER
