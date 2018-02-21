import './css/style.css';
import tpl from "./templates/index.hbs";
import bookmarklet from "./templates/bookmarklet.hbs";
import login from "./templates/login.hbs";
import Recorder from "./recorder.js";

function hide(el) {
    el.style.display = "none";
}

function show(el) {
    el.style.display = "block";
}

if (window.abm === undefined) {
    window.abm = {};
    window.abm.open = false;
    window.abm.authed = false;

    /* failed attempt at hacking CSP
    var meta = document.createElement("meta");
    meta.httpEquiv = "Content-Security-Policy";
    meta.content = "frame-src * 'self'; style-src 'unsafe-inline'";
    document.getElementsByTagName("head")[0].appendChild(meta);
    */

    var div = document.createElement("div");

    div.innerHTML = bookmarklet({
        open_button: "<"
    });

    document.body.appendChild(div);

    var bm = document.getElementById("abmbookmarklet");
    var control = document.getElementById("abmcontrol");
    var title = document.getElementById("abmtitle");
    var content = document.getElementById("abmcontent");
    var loginButton = document.getElementById("abmloginbutton");
    var loginWindow = document.createElement("div");

    loginWindow.innerHTML = login({
        login_url: "https://localhost:8000/login"
    });

    window.abm.toggle = function() {
        title.classList.toggle("hidden");
        content.classList.toggle("hidden");
        if (window.abm.open) {
            control.innerHTML = "<";
            window.abm.open = false;
        } else {
            control.innerHTML = ">";
            window.abm.open = true;
        }
    }
    control.onclick = window.abm.toggle;

    window.abm.login = function() {
        document.body.appendChild(loginWindow);
        document.getElementById("abmcloselogin").onclick = window.abm.closeLogin;
        function checkAuth() { 
            var loginframe = document.getElementById("abmloginframe");
            setTimeout(function() {
                loginframe.contentWindow.postMessage("check", "*");
                if (!window.abm.authed) {
                    checkAuth();
                }
            }, 1000);
        }
        checkAuth();
    }
    loginButton.onclick = window.abm.login;

    window.abm.closeLogin = function() {
        hide(loginWindow);
        hide(loginButton);
        show(document.getElementById("abmrecord"));
    }


    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    var recorder;
    var audioctx;

    function startStream(stream) {
        var input = audioctx.createMediaStreamSource(stream);
        recorder = new Recorder(input);
    }

    var start_record = document.getElementById("abmstartrecord");
    var stop_record = document.getElementById("abmstoprecord");

    window.abm.startRecord = function() {
        recorder && recorder.record();
        hide(start_record);
        show(stop_record);
    }

    start_record.onclick = window.abm.startRecord;

    window.abm.stopRecord = function() {
        recorder && recorder.stop();
        recorder.exportWAV(function(blob) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", "https://localhost:8000/api/media");
            xhr.withCredentials = true;
            xhr.setRequestHeader("Content-type", "application/octet-stream");
            //xhr.setRequestHeader("Origin", "https://localhost:8000");
            xhr.send(blob);
        });
        hide(stop_record);
        show(start_record);
    }

    stop_record.onclick = window.abm.stopRecord;


    //callback from the authorization window. indicating if the user has been authed or not
    window.addEventListener("message", function(event) {
       show(document.getElementById("abmcloselogin"));
       if (event.data == 'true') {
           window.abm.authed = true;
       }
    }, false);

    if (navigator.getUserMedia) {
        audioctx = new (window.AudioContext || window.webkitAudioContext)();
        navigator.getUserMedia({ audio: true }, startStream, function(e) {
            console.log("Error");
            console.dir(e);
        });
    } else {
        console.log("Browser does not support getUserMedia");
    }
}
