var moo = window.opener;
var mew = document.getElementById('mooeditortext');

document.title = moo.wsmoo_editor['name'];

mew.value = moo.wsmoo_editor['text'].join("\n");

moo.wsmoo_editor['text'] = [];

function moo_editor_send () {

    moo.wsmoo_editor['text'] = mew.value.split("\n");
    moo.mcp_localedit_set();
    window.close();
    // TODO: don't close. Must preserve wsmoo_editor.

}

