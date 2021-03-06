var socket = io();

var yourId = Math.floor(100000 + Math.random() * 900000);
var localVideo;
var remoteVideo;

var mediaConstraints = {
    audio: true, // We want an audio track
    video: true // ...and we want a video track
};
var servers = {'iceServers': [{'urls': 'stun:stun.services.mozilla.com'}, {'urls': 'stun:stun.l.google.com:19302'}]};
var pc = new RTCPeerConnection(servers);
var knn;
const TOPK = 10;
var knnPromise = false;
var captions;

//set PeerConnection attributes and display self-preview video stream on load
window.addEventListener('load', async function(){

    knn = knnClassifier.create();
    mobilenetModule = await mobilenet.load();
    await knnRead();
    console.log("model loaded");
    
    localVideo = document.getElementById("localVideo");
    remoteVideo = document.getElementById("remoteVideo");
    captions = document.getElementById("subtitle");
    
    pc.onicecandidate = (event => {
        console.log(event);
        event.candidate ? sendMessage(socket.id, {'ice': event.candidate}) : console.log("Sent All Ice")}
    );
    pc.onaddstream = (event => remoteVideo.srcObject = event.stream);
    pc.oniceconnectionstatechange = function(){
        if(pc.iceConnectionState == 'disconnected'){
            console.log('disconnected');
            remoteVideo.srcObject = null;
        }
    };

    showLocalVideo();
});

// Sends a message to our signalling server
function sendMessage(senderID, data){
    console.log('sent message', data);
    socket.emit('sendMessage', {sender: senderID, message: data});
}

// Recieving a connection request from a peer
socket.on('recievedMessage', (data) => {
    console.log('recievedMessage', data);
    var msg = data.message
    var sender = data.sender;

    if(sender != socket.id){

        if(msg.ice != undefined)
            pc.addIceCandidate(new RTCIceCandidate(msg.ice));
        
        else if(msg.sdp.type == "offer")
            pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
            .then(() => pc.createAnswer())
            .then(answer => pc.setLocalDescription(answer))
            .then(() => sendMessage(socket.id, {'sdp': pc.localDescription}));

        else if(msg.sdp.type == "answer")
            pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    }
})

// Streams local webcam data to local video view
function showLocalVideo(){
    const webCamPromise = navigator.mediaDevices.getUserMedia(mediaConstraints)
    .then(stream => localVideo.srcObject = stream)
    .then(stream => pc.addStream(stream));

    Promise.all([webCamPromise])
    .then(values => {
        detectFrame(remoteVideo, values[0]);
    })
    .catch(error => {
        console.error(error);
    });
}

// Attempts a connection with a peer
function showRemoteVideo(){
    pc.createOffer()
    .then(offer => pc.setLocalDescription(offer))
    .then(() => sendMessage(socket.id, {'sdp': pc.localDescription}));
}

detectFrame = async (video, model) => {
    
    if(knnPromise){
        var tensor = tf.browser.fromPixels(video);
        var logits = mobilenetModule.infer(tensor, "conv_preds");
        const res = await knn.predictClass(logits, TOPK);
        if(res.label == "space"){
            processSubtitle(" ");
        }
        else if(res.label != "nothing"){
            processSubtitle(res.label[0]);
        }
    }
    setTimeout(() => {detectFrame(video, model)}, 200);
};

async function knnRead(){
    fetch('/static/abc1000.json')
    .then(response => response.text())
    .then(text => {
        knn = knnClassifier.create();
        knn.setClassifierDataset(Object.fromEntries(JSON.parse(text).map(([label, data, shape])=>[label, tf.tensor(data, shape)])));
    })
    .then(() => {knnPromise = true});
}

var subtitle = "";
var current = "";
var next = "";
function processSubtitle(chr){
    if(current == ""){
        current += chr
    }
    else{
        if(chr != current[0]){
            next += chr;
        }

        if(next.length >= 3){
            subtitle += next[0];
            current = next;
            next = "";
        }

        if(subtitle.length >= 10){
            subtitle = "";
        }
        console.log(subtitle);
        captions.innerHTML = subtitle;
    }
}