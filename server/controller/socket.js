let chessFull = {
    winner: null,
    map: Array(15).fill(null).map(e => Array(15).fill(0)),
    turn:Math.floor(Math.random()*2)+1,//1:白,2:黑,
    newest:[],
    white: {},
    black: {},
    chat:[],
    server: {
        sockets:{},
        ids:[null,null,null],
        waiting:[]
    }
};

const init = (socket,all) => {
    const {server, white, black, ...chess} = chessFull;
    socket.emit('init', chess);
    if (all){
        socket.broadcast.emit('init', chess);
    }
    else {
        if (!server.ids[1]){
            server.ids[1] = socket.id;
            socket.emit('enter-game',{gameId:1})
        }
        else if (!server.ids[2]){
            server.ids[2] = socket.id;
            socket.emit('enter-game',{gameId:2})
        }
        else {
            server.waiting.push(socket.id);
        }
    }
};

const leave = (socket) =>{
    const {server} = chessFull;
    const gameId = server.ids.indexOf(socket.id);
    if (gameId>0){
        if (server.ids[1]&&server.ids[2]){
            const newId = server.waiting.shift();
            if (newId){
                server.ids[gameId] = newId;
                server.sockets[newId].emit('enter-game',{gameId});
            }
            else {
                server.ids[gameId] = null
            }
        }
        else if ((server.ids[1]&&!server.ids[2])||(!server.ids[1]&&server.ids[2])){
            server.ids[gameId] = null;
        }
    }
    else {
        const waitingId = server.waiting.indexOf(socket.id);
        server.waiting.splice(waitingId,1);
    }
    delete server.sockets[socket.id];
};


module.exports = function (socket) {
    console.log(socket.id + 'connected');
    //连接上告知玩家当前状态
    //只能2个人玩
    init(socket);
    chessFull.server.sockets[socket.id] = socket;
    socket.on('step', function ({position}) {
        const {y,x} = position;
        const {map,server,turn,newest} = chessFull;
        const {ids,waiting} = server;
        console.log(`当前玩家:${JSON.stringify(ids)} 请求玩家:${socket.id} 轮到${turn}`);
        console.log(`当前等待玩家:${JSON.stringify(waiting)}`);

        if (ids.indexOf(socket.id)===turn){
            //指定玩家
            if (map[y] && map[y][x] !== undefined) {
                if (map[y][x]===0){
                    //只能在未下地方下
                    map[y][x] = turn;
                    const nextTurn = 3-turn;
                    chessFull.turn = nextTurn;
                    socket.broadcast.emit('step', {position:[y, x],nextTurn,turn});
                    socket.emit('step', {position:[y, x],nextTurn,turn});
                    newest[0] = y;
                    newest[1] = x;
                    return
                }
            }
        }
        console.log(`${server.ids},请求玩家:${socket.id} ${turn}`);
        socket.emit('step-error');
    });
    socket.on('restart', function () {
        chessFull.winner = null;
        chessFull.chat = [];
        chessFull.turn = Math.floor(Math.random()*2)+1;//1:白,2:黑;
        chessFull.map = Array(15).fill(null).map(e => Array(15).fill(0));
        init(socket,true);
    });
    socket.on('chat',function ({value}) {
        const {server,chat} = chessFull;
        const gameId = server.ids.indexOf(socket.id);
        chat.push({gameId,chat:value});
        socket.emit('chat',{gameId,chat:value});
        socket.broadcast.emit('chat',{gameId,chat:value})
    });
    socket.on('disconnect',function () {
        leave(socket);
    })
};
