var conf = { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] };
var pc = new RTCPeerConnection(conf);
let localVideo = document.getElementById("local");
let remoteVideo = document.getElementById("remote");
const remoteStream = new MediaStream();
remoteVideo.srcObject = remoteStream;

let wsUriNewOffer = "wss://192.168.0.159:8086/addNewOffer";
let wsUriAcceptOffer = "wss://192.168.0.159:8086/acceptOffer";
var webSocketAccept;
var websocketAdd;

let offerRemoteOrLocal = null;

var localStream, _fileChannel, chatEnabled, context, source,
    _chatChannel, sendFileDom = {},
    recFileDom = {},
    receiveBuffer = [],
    receivedSize = 0,
    file,
    bytesPrev = 0;

function errHandler(err) {
    console.log(err);
}

function enableChat() {
    enable_chat.checked ? (chatEnabled = true) : (chatEnabled = false);
}
enableChat();


const stream = navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
        width: {
            min: 1280
        },
        height: {
            min: 720
        }
    }
}).then(stream => {
    localStream = stream;
    pc.addStream(stream);
    localVideo.srcObject = stream;
}).catch(errHandler);

function sendMsg() {
    var text = sendTxt.value;
    chat.innerHTML = chat.innerHTML + "<pre class=sent>" + text + "</pre>";
    _chatChannel.send(text);
    sendTxt.value = "";
    return false;
}
pc.ondatachannel = function(e) {
    if (e.channel.label == "fileChannel") {
        console.log('fileChannel Received -', e);
        _fileChannel = e.channel;
        fileChannel(e.channel);
    }
    if (e.channel.label == "chatChannel") {
        console.log('chatChannel Received -', e);
        _chatChannel = e.channel;
        chatChannel(e.channel);
    }
};


function sendOfferToServer(offer) {
    console.log("Sending to server!");
    let raw = JSON.stringify({
        "offer": offer
    });
    websocketAdd = new WebSocket(wsUriNewOffer);
    websocketAdd.onopen = function() {
        websocketAdd.send(raw); //Will work here!
    }
    websocketAdd.onmessage = (msg) => {
        try {
            if (JSON.parse(msg.data).type) {
                console.log("It should work by now...")
                var _remoteOffer = new RTCSessionDescription(JSON.parse(msg.data));
                pc.setRemoteDescription(_remoteOffer).then(function() {
                    if (_remoteOffer.type == "offer") {
                        pc.createAnswer().then(function(description) {
                            pc.setLocalDescription(description).then(function() {}).catch(errHandler);
                        }).catch(errHandler);
                    }
                }).catch(errHandler);

            } else {

                var localOfferVal = JSON.parse(msg.data).offerID;
                localOffer.value = localOfferVal

            }
        } catch (e) {

        }
    }
}

function acceptOfferFromServer() {
    webSocketAccept = new WebSocket(wsUriAcceptOffer + "?id=" + remoteOffer.value);
    webSocketAccept.onmessage = (evt) => {
        var _remoteOffer = new RTCSessionDescription(JSON.parse(evt.data).offer.offer);
        //console.log('remoteOffer \n', _remoteOffer);
        offerRemoteOrLocal = "remote";
        pc.setRemoteDescription(_remoteOffer).then(function() {
            console.log('setRemoteDescription ok');
            if (_remoteOffer.type == "offer") {
                pc.createAnswer().then(function(description) {
                    //console.log('createAnswer 200 ok \n', description);
                    pc.setLocalDescription(description).then(function() {}).catch(errHandler);
                }).catch(errHandler);
            }
        }).catch(errHandler);
    };
}

pc.onicecandidate = function(e) {
    var cand = e.candidate;
    if (!cand) {
        console.log('iceGatheringState complete', pc.localDescription.sdp);
        if (offerRemoteOrLocal == "local") {
            //send offer to the server
            sendOfferToServer(pc.localDescription);
        } else if (offerRemoteOrLocal == "remote") {
            console.log("Sending remote to server")
            webSocketAccept.send(JSON.stringify(pc.localDescription))
        }
    } else {
        console.log(cand.candidate);
    }
}
pc.oniceconnectionstatechange = function() {
    console.log('iceconnectionstatechange: ', pc.iceConnectionState);
}
pc.ontrack = function(e) {
    console.log('remote ontrack', e);
    remoteVideo.srcObject = e.streams[0];
}

pc.onconnection = function(e) {
    console.log('onconnection ', e);
}

remoteOfferGot.onclick = function() {
    var remoteOffer = document.getElementById("remoteOffer");
    acceptOfferFromServer();
    /*
    var _remoteOffer = new RTCSessionDescription(JSON.parse(remoteOffer.value));
    console.log('remoteOffer \n', _remoteOffer);
    offerRemoteOrLocal = "remote";
    pc.setRemoteDescription(_remoteOffer).then(function() {
        console.log('setRemoteDescription ok');
        if (_remoteOffer.type == "offer") {
            pc.createAnswer().then(function(description) {
                console.log('createAnswer 200 ok \n', description);
                pc.setLocalDescription(description).then(function() {}).catch(errHandler);
            }).catch(errHandler);
        }
    }).catch(errHandler);
    */
}


localOfferSet.onclick = function() {
    if (chatEnabled) {
        _chatChannel = pc.createDataChannel('chatChannel');
        _fileChannel = pc.createDataChannel('fileChannel');
        // _fileChannel.binaryType = 'arraybuffer';
        chatChannel(_chatChannel);
        fileChannel(_fileChannel);
    }

    offerRemoteOrLocal = "local";
    pc.createOffer().then(des => {
        console.log('createOffer ok ');
        pc.setLocalDescription(des).then(() => {
            setTimeout(function() {
                if (pc.iceGatheringState == "complete") {
                    return;
                } else {
                    console.log('after GetherTimeout');
                    localOffer.value = JSON.stringify(pc.localDescription);
                }
            }, 2000);
            console.log('setLocalDescription ok');
        }).catch(errHandler);
        // For chat
    }).catch(errHandler);
}

//File transfer
fileTransfer.onchange = function(e) {
    var files = fileTransfer.files;
    if (files.length > 0) {
        file = files[0];
        sendFileDom.name = file.name;
        sendFileDom.size = file.size;
        sendFileDom.type = file.type;
        sendFileDom.fileInfo = "areYouReady";
        console.log(sendFileDom);
    } else {
        console.log('No file selected');
    }
}

function sendFile() {
    if (!fileTransfer.value) return;
    var fileInfo = JSON.stringify(sendFileDom);
    _fileChannel.send(fileInfo);
    console.log('file info sent');
}


function fileChannel(e) {
    _fileChannel.onopen = function(e) {
        console.log('file channel is open', e);
    }
    _fileChannel.onmessage = function(e) {
        // Figure out data type
        var type = Object.prototype.toString.call(e.data),
            data;
        if (type == "[object ArrayBuffer]") {
            data = e.data;
            receiveBuffer.push(data);
            receivedSize += data.byteLength;
            recFileProg.value = receivedSize;
            if (receivedSize == recFileDom.size) {
                var received = new window.Blob(receiveBuffer);
                file_download.href = URL.createObjectURL(received);
                file_download.innerHTML = "download";
                file_download.download = recFileDom.name;
                // rest
                receiveBuffer = [];
                receivedSize = 0;
                // clearInterval(window.timer);	
            }
        } else if (type == "[object String]") {
            data = JSON.parse(e.data);
        } else if (type == "[object Blob]") {
            data = e.data;
            file_download.href = URL.createObjectURL(data);
            file_download.innerHTML = "download";
            file_download.download = recFileDom.name;
        }

        // Handle initial msg exchange
        if (data.fileInfo) {
            if (data.fileInfo == "areYouReady") {
                recFileDom = data;
                recFileProg.max = data.size;
                var sendData = JSON.stringify({ fileInfo: "readyToReceive" });
                _fileChannel.send(sendData);
                // window.timer = setInterval(function(){
                // 	Stats();
                // },1000)				
            } else if (data.fileInfo == "readyToReceive") {
                sendFileProg.max = sendFileDom.size;
                sendFileinChannel(); // Start sending the file
            }
            console.log('_fileChannel: ', data.fileInfo);
        }
    }
    _fileChannel.onclose = function() {
        console.log('file channel closed');
    }
}

function chatChannel(e) {
    _chatChannel.onopen = function(e) {
        console.log('chat channel is open', e);
    }
    _chatChannel.onmessage = function(e) {
        chat.innerHTML = chat.innerHTML + "<pre>" + e.data + "</pre>"
    }
    _chatChannel.onclose = function() {
        console.log('chat channel closed');
    }
}

function sendFileinChannel() {
    var chunkSize = 16384;
    var sliceFile = function(offset) {
        var reader = new window.FileReader();
        reader.onload = (function() {
            return function(e) {
                _fileChannel.send(e.target.result);
                if (file.size > offset + e.target.result.byteLength) {
                    window.setTimeout(sliceFile, 0, offset + chunkSize);
                }
                sendFileProg.value = offset + e.target.result.byteLength
            };
        })(file);
        var slice = file.slice(offset, offset + chunkSize);
        reader.readAsArrayBuffer(slice);
    };
    sliceFile(0);
}

function Stats() {
    pc.getStats(null, function(stats) {
        for (var key in stats) {
            var res = stats[key];
            console.log(res.type, res.googActiveConnection);
            if (res.type === 'googCandidatePair' &&
                res.googActiveConnection === 'true') {
                // calculate current bitrate
                var bytesNow = res.bytesReceived;
                console.log('bit rate', (bytesNow - bytesPrev));
                bytesPrev = bytesNow;
            }
        }
    });
}

streamAudioFile.onchange = function() {
    console.log('streamAudioFile');
    context = new AudioContext();
    var file = streamAudioFile.files[0];
    if (file) {
        if (file.type.match('audio*')) {
            var reader = new FileReader();
            reader.onload = (function(readEvent) {
                context.decodeAudioData(readEvent.target.result, function(buffer) {
                    // create an audio source and connect it to the file buffer
                    source = context.createBufferSource();
                    source.buffer = buffer;
                    source.start(0);

                    // connect the audio stream to the audio hardware
                    source.connect(context.destination);

                    // create a destination for the remote browser
                    var remote = context.createMediaStreamDestination();

                    // connect the remote destination to the source
                    source.connect(remote);

                    local.srcObject = remote.stream
                    local.muted = true;
                    // add the stream to the peer connection
                    pc.addStream(remote.stream);

                    // create a SDP offer for the new stream
                    // pc.createOffer(setLocalAndSendMessage);
                });
            });

            reader.readAsArrayBuffer(file);
        }
    }
}

var audioRTC = function(cb) {
    console.log('streamAudioFile');
    window.context = new AudioContext();
    var file = streamAudioFile.files[0];
    if (file) {
        if (file.type.match('audio*')) {
            var reader = new FileReader();
            reader.onload = (function(readEvent) {
                context.decodeAudioData(readEvent.target.result, function(buffer) {
                    // create an audio source and connect it to the file buffer
                    var source = context.createBufferSource();
                    source.buffer = buffer;
                    source.start(0);

                    // connect the audio stream to the audio hardware
                    source.connect(context.destination);

                    // create a destination for the remote browser
                    var remote = context.createMediaStreamDestination();

                    // connect the remote destination to the source
                    source.connect(remote);
                    window.localStream = remote.stream;
                    cb({ 'status': 'success', 'stream': true });
                });
            });

            reader.readAsArrayBuffer(file);
        }
    }
}