### serverless-webrtc
---
* Is it possible to create a p2p connection without a signalling server? 
Yes!
* How?? copy paste the SDPs between local and remote that's it!
* Are you kidding?? Nope, Please open `webrtc-noserver.html` in a localhost and go through the steps. 
* This Serverless webRTC concept is only for learning javascript webRTC APIs

### setup
on macOS/Linux just clone this repo

`
cd serverless-webrtc

python -m SimpleHTTPServer 8080

http://localhost:8080/webrtc-noserver.html
`
### Usage
* open this url in two tabs lets say A and B.
* click on createOffer in A, copy paste the sdp in B's Remote text box, click "answer" button and this will add sdp to local text box.
* Of B's local text box, copy paste sdp text in to A's Remote text box and click on "answer" button, then you should be able to see p2p connection working

### features
* peer to peer video calling
* chat
* file transfer

### Snap
![serverless-webrtc](snap.png)