#!/usr/bin/env perl
#
# A STDIN/STDOUT websocketd MOO gateway
#

use Coro;
use Coro::Handle;
use AnyEvent::Handle;
use AnyEvent::Log;

use Config::Tiny;
use FindBin qw($Bin);

use utf8;      # so literals and identifiers can be in UTF-8
use v5.16;     # or later to get "unicode_strings" feature
use strict;    # quote strings, declare variables
use warnings;  # on by default
use warnings  qw(FATAL utf8);    # fatalize encoding glitches
use open      qw(:std :utf8);    # undeclared streams in UTF-8

my $my_name = 'moo-stdio-gateway';

my ($coro_debug_socket, $host, $port, $oobauthkey, $origin);

my $config = Config::Tiny->read( "$Bin/$my_name.conf" );

$coro_debug_socket = $config->{coro}->{socketpath}   || '/tmp/socketpath';

$host              = $config->{server}->{host}       || '127.0.0.1';
$port              = $config->{server}->{port}       || 7777;
$oobauthkey        = $config->{server}->{oobauthkey} || 'DEFINE_IT';

$origin            = $config->{client}->{origin}     || '';

my $HTTP_ORIGIN = $ENV{'HTTP_ORIGIN'} || $ENV{'ORIGIN'} || '';

# Allow websocket from Android app
$origin = $HTTP_ORIGIN if $HTTP_ORIGIN eq 'file://';

die "Client not allowed from this origin ($HTTP_ORIGIN)" if ( $origin ne $HTTP_ORIGIN );

use Coro::Debug;
our $server = new_unix_server Coro::Debug "$coro_debug_socket.$$";

my $oob_cmd        = "";
my $http_x_real_ip = $ENV{'HTTP_X_REAL_IP'} || '127.0.0.1';

# Client Output
my $out = new_from_fh Coro::Handle *STDOUT;

my $cv = AnyEvent->condvar;

# Server
my $tcph ;
$tcph = new AnyEvent::Handle
    connect => [ $host, $port ],
    on_error => sub {
        my ($hdl, $fatal, $msg) = @_;
        AE::log error => $msg;
        $hdl->destroy;
        $cv->send;
        exit;
    },
    on_read => sub {
        my ($hdl) = @_;
        $hdl->push_read( line => sub {
            my ($hdl, $line, $eol) = @_;
            unless ( is_oob_cmd($line) ) {
                $out->print("$line\n");
            }
            $0 = "$my_name ($http_x_real_ip) [$oob_cmd]";
        });
    };


# Client Input
my $in;
$in = new AnyEvent::Handle
    fh => \*STDIN,
    on_error => sub {
        my ($hdl, $fatal, $msg) = @_;
        AE::log error => $msg;
        $hdl->destroy;
        $cv->send;
    },
    on_read => sub {
        my ($hdl) = @_;
        $hdl->push_read( line => sub {
            my ($hdl, $cmd, $eol) = @_;
            unless ( is_oob_cmd($cmd) ) {
                $tcph->push_write("$cmd\n");
            }
        });
    };

$cv->recv;

sub is_oob_cmd {
    my ($line) = @_;

    if ( substr($line, 0, 7) eq '#$#mcp ' ) {
        $tcph->push_write("#\$#ws-connection $oobauthkey remoteip: $http_x_real_ip version: 0.9999 \n");
    }

    return 0 unless substr($line, 0, 5)  eq '#$#ws';
    return 1 if     substr($line, 0, 10) eq '#$#ws-ping';

    $oob_cmd = substr $line, 6;

    return 1;
}
