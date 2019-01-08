import React, {Component} from 'react';
import IO from 'socket.io-client'
import black from './static/black.png'
import white from './static/white.png'
import bg from './static/bg.jpg'
import config from './config'
import './App.css';

class App extends Component {

    componentDidMount(){
        this.socket = IO(config.socket);
        this.socket.on('init',data=>{
            this.setState(data);
        });
        this.socket.on('step',(data)=>{
            const {map} = this.state;
            const {position,nextTurn,turn} = data;
            const [y,x] = position;
            if (map[y]&&map[y][x]){
                return;
            }
            map[y][x] = turn;
            this.setState({map,turn:nextTurn,newest:[y,x]});
        });
        this.socket.on('enter-game',({gameId})=>{
            this.setState({gameId})
        });
        this.socket.on('chat',({chat,gameId})=>{
            this.setState({chat:[...this.state.chat,{chat,gameId}]})
        })
    }
    state = {
        winner:null,
        gameId:0,
        turn:1,//1:白,2:黑
        map:Array(15).fill(null).map(e=>Array(15).fill(0)),
        newest:[],
        white:{},
        black:{},
        chatInput:'',
        chat:[]
    };
    step(y,x){
        this.socket.emit('step',{position:{y,x}});
    }
    restart(){
        this.socket.emit('restart')
    }
    win(y,x){
        const {turn,white,black} = this.state;
        const player = turn===1?white:black;
        player[y]?player[y].push(x):player[y] = [x];
    }
    editChat(e){
        const value = e.target.value;
        if (e.keyCode==13){
            this.socket.emit('chat',{value});
            this.setState({chatInput:""});
        }
        else {
            this.setState({chatInput:value});
        }
    }

    render() {
        const {map,turn,gameId,newest,chat,chatInput} = this.state;
        return (
            <div className="App">
                <div className="bg" style={{backgroundImage:`url("${turn===1?bg:bg}")`,backgroundSize:'cover'}}>
                    {map.map((row,y)=>{
                        return <div key={y}>
                                {row.map((col,x)=>{
                                    return (
                                        <div id={`${x.toString(16)+y.toString(16)}`}
                                             className={newest[0]==y&&newest[1]==x?'chess hightlight':'chess'}
                                             chess={col.toString()}
                                             onClick={e=>this.step(y,x)}
                                             style={{
                                                 left:`${x*35+22-17.5}px`,
                                                 top:`${y*35+22-17.5}px`,
                                                 background:`${col==0?'':`url("${col==1?white:black}")`}`
                                             }}
                                             key={x}
                                        />
                                    )
                                })}
                        </div>
                    })}
                </div>
                <div className="controls">
                    <div>
                        {gameId?<div>游戏中...{turn==gameId?<span style={{color:'red'}}>轮到你</span>:'轮到对面'} 你是:{gameId==1?'白':'黑'}</div>:null}
                    </div>
                    <button className="restart" onClick={e=>this.restart()}>重开</button>
                </div>
                <div className="chat">
                    {chat.map((chatInfo,index)=>{
                        const {chat,gameId} = chatInfo;
                        return <span key={index}>{gameId>0?`玩家${gameId==1?'白':'黑'}`:'观战男'} : {chat}</span>
                    })}
                    <input value={chatInput} onChange={e=>this.setState({chatInput:e.target.value})} onKeyUp={e=>this.editChat(e)} placeholder="输入玩蛇皮"/>
                </div>
            </div>
        );
    }
}

export default App;
