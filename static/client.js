var socket = io();

socket.on('chat message', () => {
    console.log('connected and echoed');
});

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

async function load(){
    knn = knnClassifier.create();
    mobilenetModule = await mobilenet.load();
    await knnRead();
    console.log("model loaded");
}

//set PeerConnection attributes and display self-preview video stream on load
window.addEventListener('load', async function(){

    await load();
    
    document.getElementById("yourID").innerHTML = "Your User ID: " + yourId;
    localVideo = document.getElementById("localVideo");
    remoteVideo = document.getElementById("remoteVideo");
    
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
        this.detectFrame(localVideo, values[0]);
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

    var tensor = tf.browser.fromPixels(video);
    var logits = mobilenetModule.infer(tensor, "conv_preds");
    const res = await knn.predictClass(logits, TOPK);
    console.log(res.label);
    setTimeout(() => {detectFrame(video, model)}, 200);

    // frame = tf.browser.fromPixels(video);
    // frame = frame.as4D(-1, 64, 64, 3);
    // var predictions = model.predict(frame);
    // predictions = predictions.dataSync();
    // console.log(predictions);
    // var i = predictions.indexOf(Math.max(...predictions));
    // console.log(CLASSES[i]);
    // //console.log(String.fromCharCode(97 + i));
};

const CLASSES = ['a', 'b', 'c', 'd', 'del', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 
'm', 'n', 'nothing', 'o', 'p', 'q', 'r', 's', 'space', 't', 'u', 'v', 'w', 'x', 'y', 'z'];

async function knnRead(){
    fetch('/static/knn100.json')
    .then(response => response.text())
    .then(text => {
        knn = knnClassifier.create();
        knn.setClassifierDataset(Object.fromEntries(JSON.parse(text).map(([label, data, shape])=>[label, tf.tensor(data, shape)])));
    });
}