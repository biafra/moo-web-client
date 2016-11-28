//
// MOOsaico Websockets HTTPS Client
//

var cb = is.ie()      ? 'i' :
         is.chrome()  ? 'c' :
         is.firefox() ? 'f' :
         is.safari()  ? 's' : '';
var co = is.windows() ? 'w' :
         is.linux()   ? 'l' :
         is.ios()     ? 'i' :
         is.android() ? 'a' :
         is.mac()     ? 'm' : '';

var wsmoo_version  = '0.9'+cb+'-'+co;

var wsmoo = new WebSocket('wss://secure.moosaico.com:443/websocket/moo');
// wsmoo.setMaxIdleTime(3600000);

var wsmoo_mcp_auth = create_mcp_authkey();

var wsmoo_is_localediting = 0;
var wsmoo_editor          = { text:[] };
var wsmoo_screenmode      = 0;

var wsmoo_mooscreen_div  = 0;
var wsmoo_moocommand_div = 0;
var wsmoo_moostatus_div  = 0;
var wsmoo_moosound_div   = 0;

wsmoo.onopen = function() {

    wsmoo_mooscreen_div  = document.getElementById('mooscreen');
    wsmoo_moocommand_div = document.getElementById('moocommand');
    wsmoo_moostatus_div  = document.getElementById('moostatus');
    wsmoo_moosound_div   = document.getElementById('moosound');

 	wsmoo_mooscreen_div.style.backgroundColor = '#fff';
};

wsmoo.onclose = function() {
 	wsmoo_mooscreen_div.style.backgroundColor = '#ccc';
    document.title = "MOOsaico: Offline";
};

wsmoo.onmessage = function(event) {

	var msg = event.data;

	if (msg.indexOf("#$#mcp ") == 0) {
        wsmoo.send("#$#mcp authentication-key: " + wsmoo_mcp_auth + " version: 2.1 to: 2.1");
        document.title = "MOOsaico: Online";
    }

	if (msg.indexOf('#$#mcp-negotiate-end') == 0) {
        wsmoo.send("#$#mcp-negotiate-can " + wsmoo_mcp_auth + " package: mcp-negotiate min-version: 1.0 max-version: 2.0");
        wsmoo.send("#$#mcp-negotiate-can " + wsmoo_mcp_auth + " package: dns-com-vmoo-client min-version: 1.0 max-version: 1.0");
        wsmoo.send("#$#mcp-negotiate-can " + wsmoo_mcp_auth + " package: dns-com-awns-status min-version: 1.0 max-version: 1.0");
        wsmoo.send("#$#mcp-negotiate-can " + wsmoo_mcp_auth + " package: dns-com-awns-displayurl min-version: 1.0 max-version: 2.0");
        wsmoo.send("#$#mcp-negotiate-can " + wsmoo_mcp_auth + " package: dns-org-mud-moo-simpleedit min-version: 1.0 max-version: 1.0");
        wsmoo.send("#$#mcp-negotiate-end " + wsmoo_mcp_auth);

        setTimeout(function() {
            mcp_client_info();
        }, 3000);

	}

    if (msg.indexOf("#$#") == 0) {
        mcp_dispatch( msg );
        return;
    }

	var div = document.getElementById('mooscreen');
    try{
        msgutf8 = decodeURIComponent(escape(msg));
    }catch(e){
        msgutf8 = msg;
    }
	div.innerHTML += msgutf8 + "<br/>";
	div.scrollTop = div.scrollHeight;

};

// window.setInterval(mcp_ping,60000);

function wsmoosend() {
	var msgobj = document.getElementById('moocommand');
	wsmoo.send(msgobj.value);
	msgobj.value = "";
}

// http://stackoverflow.com/questions/2817646/javascript-split-string-on-space-or-on-quotes-to-array
function parse_mcp_alist( msg ) {

    var params = {};

    //The parenthesis in the regex creates a captured group within the quotes
    var myRegexp = /[^ "]+|"([^"]*)"/gi;
    var myString = msg;
    var myArray = [];

    do {
        //Each call to exec returns the next regex match as an array
        var match = myRegexp.exec(myString);
        if (match != null)
        {
            //Index 1 in the array is the captured group if it exists
            //Index 0 is the matched text, which we use if no captured group exists
            myArray.push(match[1] ? match[1] : match[0]);
        }
    } while (match != null);

    params['proto'] = myArray[0];
    params['key']   = myArray[1];

    for ( i = 2, l = myArray.length; i < l; i+=2 ) {
        params[myArray[i]] = myArray[i+1];
    }

    return params;
}

function parse_mcp_multiline ( msg ) {
    var params = {};
    var myArray = [];

    var myRegexp = /^([\*\:]) (\S+)($| (\S+:) (.*)$)/g;

    myArray  = myRegexp.exec(msg);

    params['proto']    = myArray[1];
    params['key']      = myArray[2];
    params[myArray[4]] = myArray[5];

    return params;
}

function create_mcp_authkey() {
    var authkey = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 10; i++ )
        authkey += possible.charAt(Math.floor(Math.random() * possible.length));

    return authkey;
}

function mcp_dispatch( msg ) {

		lmcpargs = parse_mcp_alist(msg.substr(3,msg.length));
		protocol = lmcpargs['proto'];
		authkey  = lmcpargs['key'];

        if (authkey != wsmoo_mcp_auth) {
            if ((protocol == '*' || protocol == ':' ) && wsmoo_is_localediting == authkey) {
                lmcpargs = parse_mcp_multiline(msg.substr(3,msg.length));
                mcp_localedit_content(lmcpargs);
            }
            return;
        }

        if ( protocol == 'dns-com-awns-status' ) {
            mcp_status(lmcpargs);
        }
        else if (protocol == 'dns-com-awns-displayurl') {
            mcp_displayurl(lmcpargs);
        }
        else if (protocol == 'dns-org-mud-moo-simpleedit-content') {
            mcp_localedit(lmcpargs);
        }

}

function mcp_status ( mcp_args ) {
    //var div = document.getElementById('moostatus');
    wsmoo_moostatus_div.innerHTML = mcp_args['text:'];
}

function mcp_ping() {
    wsmoo.send('#$#ws-ping');
}

function mcp_client_info() {
    wsmoo.send('#$#dns-com-vmoo-client-info ' + wsmoo_mcp_auth + ' name: wsMOO text-version: ' + wsmoo_version + ' internal-version: 0 reg-id: 0 flags: ""');
    wsmoo.send('#$#dns-com-vmoo-client-screensize ' + wsmoo_mcp_auth + ' cols: 79 rows: 25');
}

function mcp_displayurl ( mcp_args ) {

    var target = mcp_args['target:'] ? mcp_args['target:'] : 'moowindow';
    var type   = mcp_args['type:']   ? mcp_args['type:']   : 'text/html';
    var url    = mcp_args['url:'];

    if ( target == 'mooscreen' ) {

        var div = document.getElementById( target );

        if ( type == 'image/png' ) {

            div.innerHTML += '<img src="' + url + '" width="190" height="90" class="imgframe"><br/>';

        } else {

            div.innerHTML += '<object type="' + type +'" data="' + url + '"></object><br/>';
        }

        div.scrollTop = div.scrollHeight;

    } else if ( target == 'moosound' ) {

        //wsmoo_moosound_div.innerHTML = '<object type="' + type +'" data="' + url + '"></object><br/>';
        wsmoo_moosound_div.innerHTML = '<audio autoplay><source type="' + type +'" src="' + url + '"></source></audio><br/>';

    } else {

        window.open( url,
                     target,
                     'width=800,height=640,menubar=no,toolbar=no,location=no,titlebar=no' );

    }
}

function mcp_localedit ( mcp_args ) {

    var reference = mcp_args['reference:'];
    var name      = mcp_args['name:'];
    var type      = mcp_args['type:'];
    var content   = mcp_args['content*:'];
    var datatag   = mcp_args['_data-tag:'];

    wsmoo_is_localediting = datatag;
    wsmoo_editor['reference'] = reference;
    wsmoo_editor['name']      = name;
    wsmoo_editor['type']      = type;
    wsmoo_editor['datatag']   = datatag;

}

function mcp_localedit_content ( mcp_args ) {

    var proto   = mcp_args['proto'];
    var datatag = mcp_args['key'];
    var content = mcp_args['content:'];
    var wsmoo_editor_window;

    if (datatag == wsmoo_is_localediting) {
        if ( proto == '*' ) {
            wsmoo_editor['text'].push(content);
        }
        else if ( proto == ':' ) {
            wsmoo_is_localediting = 0;

            wsmoo_editor_window = window.open("moo-editor.html","MOOEditor","toolbar=no, scrollbars=yes, directories=no, location=no, menubar=no, status=no,width=720,height=466");
        }
    }
}

function mcp_localedit_set () {

    var datatag = create_mcp_authkey();

    wsmoo.send(
        '#$#dns-org-mud-moo-simpleedit-set ' + wsmoo_mcp_auth +
        ' reference: "' + wsmoo_editor['reference'] + '"' +
        ' type: '       + wsmoo_editor['type']      +
        ' content*: ""' +
        ' _data-tag: '  + datatag
    );

    for (i = 0, len = wsmoo_editor['text'].length; i < len; i++)
        wsmoo.send(
            '#$#* '      + datatag +
            ' content: ' + wsmoo_editor['text'][i]
        );

    wsmoo.send( '#$#: ' + datatag );

    wsmoo_editor = { text:[] };
}

function wsmoo_screenmode_toogle () {

    var div = wsmoo_mooscreen_div;

    if (wsmoo_screenmode) {
        div.style.backgroundColor = '#fff';
        div.style.color = '#000';
        wsmoo_screenmode = 0;
    } else {
        div.style.backgroundColor = '#000';
        div.style.color = '#fff';
        wsmoo_screenmode = 1;
    }
}

