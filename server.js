const express = require('express');
const app = express();
const fs = require('fs');
const { env } = require('process');


require('dotenv').config({ path: __dirname + '/.env' });

let https;

if (env.NODE_ENV == "production") {
    var options = {
        key: fs.readFileSync('/etc/apache2/ssl/ca.key'),
        cert: fs.readFileSync('/etc/apache2/ssl/ca_ca.crt'),
        ca: fs.readFileSync('/etc/apache2/ssl/ca_ca.crt')
    };

    https = require('https').createServer(options, app);

} else {
    https = require('http').createServer(app);
}



app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
    next();
});

app.use('/home', express.static('public'));

const io = require('socket.io')(https, {
    cors: {
        origin: "*"
    }
});

app.get('/', (req, res) => {
    res.send("Arena");
})



io.on('connection', socket => {
    socket.on('join',async (roomId) => {
       
        const roomClients = io.sockets.adapter.rooms.get(roomId) !=undefined ?   io.sockets.adapter.rooms.get(roomId).size : 0
        const numberOfClients = roomClients
        console.log(`number of client ${numberOfClients}`)

        if (numberOfClients == 0) {
            console.log(`creating room ${roomId} and emitting room_created socket event`);
            await  socket.join(roomId)
            socket.emit('room_created', roomId);
            console.log(io.sockets.adapter.rooms.get(roomId).size);
        } else if (numberOfClients == 1) {
            console.log(`Joining room ${roomId} and emitting room_joined socket event`)
            socket.join(roomId);
            socket.emit('room_joined', roomId)
        } else {
            console.log(`can't join room ${roomId}, emitting full_room socket evnet`);
            socket.emit('full_room', roomId);
        }

    });

    socket.on('start_call', (roomId) => {
        console.log(`Broadcasting start_call event to peers in room ${roomId}`)
        socket.broadcast.to(roomId).emit('start_call')
    })
    socket.on('webrtc_offer', (event) => {
        console.log(`Broadcasting webrtc_offer event to peers in room ${event.roomId}`)
        socket.broadcast.to(event.roomId).emit('webrtc_offer', event.sdp)
    })
    socket.on('webrtc_answer', (event) => {
        console.log(`Broadcasting webrtc_answer event to peers in room ${event.roomId}`)
        socket.broadcast.to(event.roomId).emit('webrtc_answer', event.sdp)
    })
    socket.on('webrtc_ice_candidate', (event) => {
        console.log(`Broadcasting webrtc_ice_candidate event to peers in room ${event.roomId}`)
        socket.broadcast.to(event.roomId).emit('webrtc_ice_candidate', event)
    })
})


https.listen(9002, () => {
    console.log("listening on 9002 ");
});

